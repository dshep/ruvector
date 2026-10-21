//! Storage layer with redb for metadata and memory-mapped vectors
//!
//! This module is only available when the "storage" feature is enabled.
//! For WASM builds, use the in-memory storage backend instead.

#[cfg(feature = "storage")]
use crate::error::{Result, RuvectorError};
#[cfg(feature = "storage")]
use crate::types::{DbOptions, VectorEntry, VectorId};
#[cfg(feature = "storage")]
use bincode::config;
#[cfg(feature = "storage")]
use once_cell::sync::Lazy;
#[cfg(feature = "storage")]
use parking_lot::Mutex;
#[cfg(feature = "storage")]
use redb::{Database, ReadableTable, ReadableTableMetadata, TableDefinition};
#[cfg(feature = "storage")]
use serde_json;
#[cfg(feature = "storage")]
use std::collections::HashMap;
#[cfg(feature = "storage")]
use std::path::{Path, PathBuf};
#[cfg(feature = "storage")]
use std::mem::ManuallyDrop;
#[cfg(feature = "storage")]
use std::sync::Arc;

#[cfg(feature = "storage")]

const VECTORS_TABLE: TableDefinition<&str, &[u8]> = TableDefinition::new("vectors");
const METADATA_TABLE: TableDefinition<&str, &str> = TableDefinition::new("metadata");
const CONFIG_TABLE: TableDefinition<&str, &str> = TableDefinition::new("config");

/// Key used to store database configuration in CONFIG_TABLE
const DB_CONFIG_KEY: &str = "__ruvector_db_config__";

// Global database connection pool to allow multiple VectorDB instances
// to share the same underlying database file. Handles share a database only
// with handles of the same mode: a read-only open never shares a writable
// database, and a writable open never shares a read-only one.
static DB_POOL: Lazy<Mutex<HashMap<PathBuf, PoolEntry>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[cfg(feature = "storage")]
mod read_only_backend;

#[cfg(feature = "storage")]
use read_only_backend::{lock_held_error, ReadOnlyBackend};

struct PoolEntry {
    db: Arc<Database>,
    /// Opened through the read-only backend, under a shared lock. Every
    /// handle on the entry has this mode.
    read_only: bool,
}

/// The error every write on a read-only storage returns.
const READ_ONLY_MESSAGE: &str = "the database is open read-only";

/// Storage backend for vector database
pub struct VectorStorage {
    /// Shared with the pool entry under `pool_key`; released in `Drop`.
    db: ManuallyDrop<Arc<Database>>,
    pool_key: PathBuf,
    dimensions: usize,
    /// Refuses every write. Set by `open_read_only`.
    read_only: bool,
}

impl VectorStorage {
    /// Create or open a vector storage at the given path
    ///
    /// Writable opens of one file in this process share one database through
    /// a global connection pool, keyed on the file's canonical path.
    ///
    /// An existing file's tables are created only when one is missing, so no
    /// transaction is committed when they all exist; redb still rewrites its
    /// header on open and close, so the modification time changes. A file
    /// this process holds read-only is refused with "Database already open.
    /// Cannot acquire lock." until those handles drop.
    pub fn new<P: AsRef<Path>>(path: P, dimensions: usize) -> Result<Self> {
        let path_ref = path.as_ref();

        // Create parent directories if they don't exist (needed for canonicalize)
        if let Some(parent) = path_ref.parent() {
            if !parent.as_os_str().is_empty() && !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| {
                    RuvectorError::InvalidPath(format!("Failed to create directory: {}", e))
                })?;
            }
        }

        let path_buf = resolve_path(path_ref)?;
        let pool_key = pool_key(&path_buf)?;
        let db = pooled(&pool_key, false, || {
            let db = Database::create(&path_buf)?;
            create_missing_tables(&db)?;
            Ok(db)
        })?;

        Ok(Self {
            db: ManuallyDrop::new(db),
            pool_key,
            dimensions,
            read_only: false,
        })
    }

    /// Open an existing vector storage read-only. Nothing it does reaches the
    /// file: redb's own header writes stay in memory, and every write method
    /// fails with "the database is open read-only".
    ///
    /// Takes a shared lock: read-only opens from other processes coexist, and
    /// one is refused with "Database already open. Cannot acquire lock." while
    /// a writer holds the file, as a writer is while a reader holds it. In this
    /// process, read-only opens of one file share one database, and a file this
    /// process holds writable is refused with the same error until those
    /// handles drop. A file that does not exist, is empty, or lacks one of the
    /// vector tables is refused with "no vector store at <path>: …"; nothing
    /// is created.
    pub fn open_read_only<P: AsRef<Path>>(path: P, dimensions: usize) -> Result<Self> {
        let path_buf = resolve_path(path.as_ref())?;
        let pool_key = pool_key(&path_buf)?;
        let db = pooled(&pool_key, true, || {
            let backend = ReadOnlyBackend::open(&path_buf)?;
            if redb::StorageBackend::len(&backend)? == 0 {
                return Err(no_vector_store(&path_buf, "the file is empty"));
            }
            let db = redb::Builder::new().create_with_backend(backend)?;
            if any_table_missing(&db)? {
                return Err(no_vector_store(&path_buf, "the file has no vector tables"));
            }
            Ok(db)
        })?;

        Ok(Self {
            db: ManuallyDrop::new(db),
            pool_key,
            dimensions,
            read_only: true,
        })
    }

    /// Whether this storage refuses writes.
    pub fn is_read_only(&self) -> bool {
        self.read_only
    }

    fn refuse_if_read_only(&self) -> Result<()> {
        if self.read_only {
            return Err(RuvectorError::StorageError(READ_ONLY_MESSAGE.to_string()));
        }
        Ok(())
    }

    /// Insert a vector entry
    pub fn insert(&self, entry: &VectorEntry) -> Result<VectorId> {
        self.refuse_if_read_only()?;
        if entry.vector.len() != self.dimensions {
            return Err(RuvectorError::DimensionMismatch {
                expected: self.dimensions,
                actual: entry.vector.len(),
            });
        }

        let id = entry
            .id
            .clone()
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

        let write_txn = self.db.begin_write()?;
        {
            let mut table = write_txn.open_table(VECTORS_TABLE)?;

            // Serialize vector data
            let vector_data = bincode::encode_to_vec(&entry.vector, config::standard())
                .map_err(|e| RuvectorError::SerializationError(e.to_string()))?;

            table.insert(id.as_str(), vector_data.as_slice())?;

            // Store metadata if present
            if let Some(metadata) = &entry.metadata {
                let mut meta_table = write_txn.open_table(METADATA_TABLE)?;
                let metadata_json = serde_json::to_string(metadata)
                    .map_err(|e| RuvectorError::SerializationError(e.to_string()))?;
                meta_table.insert(id.as_str(), metadata_json.as_str())?;
            }
        }
        write_txn.commit()?;

        Ok(id)
    }

    /// Insert multiple vectors in a batch
    pub fn insert_batch(&self, entries: &[VectorEntry]) -> Result<Vec<VectorId>> {
        self.refuse_if_read_only()?;
        let write_txn = self.db.begin_write()?;
        let mut ids = Vec::with_capacity(entries.len());

        {
            let mut table = write_txn.open_table(VECTORS_TABLE)?;
            let mut meta_table = write_txn.open_table(METADATA_TABLE)?;

            for entry in entries {
                if entry.vector.len() != self.dimensions {
                    return Err(RuvectorError::DimensionMismatch {
                        expected: self.dimensions,
                        actual: entry.vector.len(),
                    });
                }

                let id = entry
                    .id
                    .clone()
                    .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

                // Serialize and insert vector
                let vector_data = bincode::encode_to_vec(&entry.vector, config::standard())
                    .map_err(|e| RuvectorError::SerializationError(e.to_string()))?;
                table.insert(id.as_str(), vector_data.as_slice())?;

                // Insert metadata if present
                if let Some(metadata) = &entry.metadata {
                    let metadata_json = serde_json::to_string(metadata)
                        .map_err(|e| RuvectorError::SerializationError(e.to_string()))?;
                    meta_table.insert(id.as_str(), metadata_json.as_str())?;
                }

                ids.push(id);
            }
        }

        write_txn.commit()?;
        Ok(ids)
    }

    /// Get a vector by ID
    pub fn get(&self, id: &str) -> Result<Option<VectorEntry>> {
        let read_txn = self.db.begin_read()?;
        let table = read_txn.open_table(VECTORS_TABLE)?;

        let Some(vector_data) = table.get(id)? else {
            return Ok(None);
        };

        let (vector, _): (Vec<f32>, usize) =
            bincode::decode_from_slice(vector_data.value(), config::standard())
                .map_err(|e| RuvectorError::SerializationError(e.to_string()))?;

        // Try to get metadata
        let meta_table = read_txn.open_table(METADATA_TABLE)?;
        let metadata = if let Some(meta_data) = meta_table.get(id)? {
            let meta_str = meta_data.value();
            Some(
                serde_json::from_str(meta_str)
                    .map_err(|e| RuvectorError::SerializationError(e.to_string()))?,
            )
        } else {
            None
        };

        Ok(Some(VectorEntry {
            id: Some(id.to_string()),
            vector,
            metadata,
        }))
    }

    /// Delete a vector by ID
    pub fn delete(&self, id: &str) -> Result<bool> {
        self.refuse_if_read_only()?;
        let write_txn = self.db.begin_write()?;
        let mut deleted = false;

        {
            let mut table = write_txn.open_table(VECTORS_TABLE)?;
            deleted = table.remove(id)?.is_some();

            let mut meta_table = write_txn.open_table(METADATA_TABLE)?;
            let _ = meta_table.remove(id)?;
        }

        write_txn.commit()?;
        Ok(deleted)
    }

    /// Get the number of vectors stored
    pub fn len(&self) -> Result<usize> {
        let read_txn = self.db.begin_read()?;
        let table = read_txn.open_table(VECTORS_TABLE)?;
        Ok(table.len()? as usize)
    }

    /// Check if storage is empty
    pub fn is_empty(&self) -> Result<bool> {
        Ok(self.len()? == 0)
    }

    /// Get all vector IDs
    pub fn all_ids(&self) -> Result<Vec<VectorId>> {
        let read_txn = self.db.begin_read()?;
        let table = read_txn.open_table(VECTORS_TABLE)?;

        let mut ids = Vec::new();
        let iter = table.iter()?;
        for item in iter {
            let (key, _) = item?;
            ids.push(key.value().to_string());
        }

        Ok(ids)
    }

    /// Save database configuration to persistent storage
    pub fn save_config(&self, options: &DbOptions) -> Result<()> {
        self.refuse_if_read_only()?;
        let config_json = serde_json::to_string(options)
            .map_err(|e| RuvectorError::SerializationError(e.to_string()))?;

        let write_txn = self.db.begin_write()?;
        {
            let mut table = write_txn.open_table(CONFIG_TABLE)?;
            table.insert(DB_CONFIG_KEY, config_json.as_str())?;
        }
        write_txn.commit()?;

        Ok(())
    }

    /// Load database configuration from persistent storage
    pub fn load_config(&self) -> Result<Option<DbOptions>> {
        let read_txn = self.db.begin_read()?;

        // Try to open config table - may not exist in older databases
        let table = match read_txn.open_table(CONFIG_TABLE) {
            Ok(t) => t,
            Err(_) => return Ok(None),
        };

        let Some(config_data) = table.get(DB_CONFIG_KEY)? else {
            return Ok(None);
        };

        let config: DbOptions = serde_json::from_str(config_data.value())
            .map_err(|e| RuvectorError::SerializationError(e.to_string()))?;

        Ok(Some(config))
    }

    /// Get the stored dimensions
    pub fn dimensions(&self) -> usize {
        self.dimensions
    }
}

/// The absolute path of a storage file, as the caller spelled it.
#[cfg(feature = "storage")]
fn resolve_path(path_ref: &Path) -> Result<PathBuf> {
    // Convert to absolute path first, then validate
    let path_buf = if path_ref.is_absolute() {
        path_ref.to_path_buf()
    } else {
        std::env::current_dir()
            .map_err(|e| RuvectorError::InvalidPath(format!("Failed to get cwd: {}", e)))?
            .join(path_ref)
    };

    // SECURITY: Check for path traversal attempts (e.g., "../../../etc/passwd")
    // Only reject paths that contain ".." components trying to escape
    let path_str = path_ref.to_string_lossy();
    if path_str.contains("..") {
        // Verify the resolved path doesn't escape intended boundaries
        // For absolute paths, we allow them as-is (user explicitly specified)
        // For relative paths with "..", check they don't escape cwd
        if !path_ref.is_absolute() {
            if let Ok(cwd) = std::env::current_dir() {
                // Normalize the path by resolving .. components
                let mut normalized = cwd.clone();
                for component in path_ref.components() {
                    match component {
                        std::path::Component::ParentDir => {
                            if !normalized.pop() || !normalized.starts_with(&cwd) {
                                return Err(RuvectorError::InvalidPath(
                                    "Path traversal attempt detected".to_string(),
                                ));
                            }
                        }
                        std::path::Component::Normal(c) => normalized.push(c),
                        _ => {}
                    }
                }
            }
        }
    }

    Ok(path_buf)
}

/// The key a storage file is pooled under: the canonical path of its parent
/// folder joined with the file name, so every spelling of one file (a
/// symlinked folder, `..` segments) shares one entry. The parent must exist.
#[cfg(feature = "storage")]
fn pool_key(path: &Path) -> Result<PathBuf> {
    let (Some(parent), Some(name)) = (path.parent(), path.file_name()) else {
        return Err(RuvectorError::InvalidPath(format!(
            "{} does not name a file",
            path.display()
        )));
    };
    match std::fs::canonicalize(parent) {
        Ok(parent) => Ok(parent.join(name)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            Err(no_vector_store(path, "the file does not exist"))
        }
        Err(e) => Err(RuvectorError::IoError(e)),
    }
}

/// The pooled database for `key` in this mode, opened by `open` when the pool
/// holds none. A database pooled in the other mode refuses the open with the
/// lock error, before any file is touched.
#[cfg(feature = "storage")]
fn pooled(
    key: &Path,
    read_only: bool,
    open: impl FnOnce() -> Result<Database>,
) -> Result<Arc<Database>> {
    let mut pool = DB_POOL.lock();
    if let Some(existing) = pool.get(key) {
        if existing.read_only != read_only {
            return Err(lock_held_error());
        }
        return Ok(Arc::clone(&existing.db));
    }
    let db = Arc::new(open()?);
    pool.insert(
        key.to_path_buf(),
        PoolEntry {
            db: Arc::clone(&db),
            read_only,
        },
    );
    Ok(db)
}

/// The refusal of a read-only open of a file that holds no vector store.
/// Callers match the stable prefix "no vector store at".
#[cfg(feature = "storage")]
fn no_vector_store(path: &Path, why: &str) -> RuvectorError {
    RuvectorError::StorageError(format!("no vector store at {}: {}", path.display(), why))
}

#[cfg(feature = "storage")]
fn any_table_missing(db: &Database) -> Result<bool> {
    let read_txn = db.begin_read()?;
    Ok(table_missing(&read_txn, VECTORS_TABLE)?
        || table_missing(&read_txn, METADATA_TABLE)?
        || table_missing(&read_txn, CONFIG_TABLE)?)
}

/// Create the three tables in one commit, only when one is missing, so
/// opening an existing store commits nothing.
#[cfg(feature = "storage")]
fn create_missing_tables(db: &Database) -> Result<()> {
    if any_table_missing(db)? {
        let write_txn = db.begin_write()?;
        {
            let _ = write_txn.open_table(VECTORS_TABLE)?;
            let _ = write_txn.open_table(METADATA_TABLE)?;
            let _ = write_txn.open_table(CONFIG_TABLE)?;
        }
        write_txn.commit()?;
    }
    Ok(())
}

#[cfg(feature = "storage")]
fn table_missing<K: redb::Key + 'static, V: redb::Value + 'static>(
    read_txn: &redb::ReadTransaction,
    table: TableDefinition<K, V>,
) -> Result<bool> {
    match read_txn.open_table(table) {
        Ok(_) => Ok(false),
        Err(redb::TableError::TableDoesNotExist(_)) => Ok(true),
        Err(e) => Err(e.into()),
    }
}

/// Dropping the last storage on a file removes its pool entry, which drops the
/// database and releases the file lock. The handle is dropped and the entry
/// checked under the pool lock, where every other clone and drop of a pooled
/// handle also happens, so an open running at the same time either shares the
/// entry before it is checked or creates a fresh one after it is removed.
#[cfg(feature = "storage")]
impl Drop for VectorStorage {
    fn drop(&mut self) {
        let mut pool = DB_POOL.lock();
        // SAFETY: `self.db` is taken once, here, and never used again.
        let db = unsafe { ManuallyDrop::take(&mut self.db) };
        let last_holder = pool
            .get(&self.pool_key)
            .is_some_and(|pooled| Arc::ptr_eq(&pooled.db, &db) && Arc::strong_count(&db) == 2);
        drop(db);
        if last_holder {
            pool.remove(&self.pool_key);
        }
    }
}

// Add uuid dependency
use uuid;

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_insert_and_get() -> Result<()> {
        let dir = tempdir().unwrap();
        let storage = VectorStorage::new(dir.path().join("test.db"), 3)?;

        let entry = VectorEntry {
            id: Some("test1".to_string()),
            vector: vec![1.0, 2.0, 3.0],
            metadata: None,
        };

        let id = storage.insert(&entry)?;
        assert_eq!(id, "test1");

        let retrieved = storage.get("test1")?;
        assert!(retrieved.is_some());
        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.vector, vec![1.0, 2.0, 3.0]);

        Ok(())
    }

    #[test]
    fn test_batch_insert() -> Result<()> {
        let dir = tempdir().unwrap();
        let storage = VectorStorage::new(dir.path().join("test.db"), 3)?;

        let entries = vec![
            VectorEntry {
                id: None,
                vector: vec![1.0, 2.0, 3.0],
                metadata: None,
            },
            VectorEntry {
                id: None,
                vector: vec![4.0, 5.0, 6.0],
                metadata: None,
            },
        ];

        let ids = storage.insert_batch(&entries)?;
        assert_eq!(ids.len(), 2);
        assert_eq!(storage.len()?, 2);

        Ok(())
    }

    #[test]
    fn test_delete() -> Result<()> {
        let dir = tempdir().unwrap();
        let storage = VectorStorage::new(dir.path().join("test.db"), 3)?;

        let entry = VectorEntry {
            id: Some("test1".to_string()),
            vector: vec![1.0, 2.0, 3.0],
            metadata: None,
        };

        storage.insert(&entry)?;
        assert_eq!(storage.len()?, 1);

        let deleted = storage.delete("test1")?;
        assert!(deleted);
        assert_eq!(storage.len()?, 0);

        Ok(())
    }

    #[test]
    fn test_multiple_instances_same_path() -> Result<()> {
        // This test verifies the fix for the database locking bug
        // Multiple VectorStorage instances should be able to share the same database file
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("shared.db");

        // Create first instance
        let storage1 = VectorStorage::new(&db_path, 3)?;

        // Insert data with first instance
        storage1.insert(&VectorEntry {
            id: Some("test1".to_string()),
            vector: vec![1.0, 2.0, 3.0],
            metadata: None,
        })?;

        // Create second instance with SAME path - this should NOT fail
        let storage2 = VectorStorage::new(&db_path, 3)?;

        // Both instances should see the same data
        assert_eq!(storage1.len()?, 1);
        assert_eq!(storage2.len()?, 1);

        // Insert with second instance
        storage2.insert(&VectorEntry {
            id: Some("test2".to_string()),
            vector: vec![4.0, 5.0, 6.0],
            metadata: None,
        })?;

        // Both instances should see both records
        assert_eq!(storage1.len()?, 2);
        assert_eq!(storage2.len()?, 2);

        // Verify data integrity
        let retrieved1 = storage1.get("test1")?;
        assert!(retrieved1.is_some());

        let retrieved2 = storage2.get("test2")?;
        assert!(retrieved2.is_some());

        Ok(())
    }
}
