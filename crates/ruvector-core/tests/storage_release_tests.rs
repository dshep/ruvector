//! A storage file's lock is released once every handle on it in this process drops.
//!
//! The lock is checked from a child process, because a second open inside this
//! process is answered by the shared connection pool and never reaches the lock.

use ruvector_core::storage::VectorStorage;
use ruvector_core::types::DbOptions;
use ruvector_core::{VectorDB, VectorEntry};
use std::path::Path;
use std::process::Command;
use tempfile::tempdir;

const PROBE_ENV: &str = "RUVECTOR_LOCK_PROBE_PATH";

/// Run in a child process by `another_process_can_open`: opens the file named
/// by the environment and fails when its lock is still held. Does nothing when
/// run directly.
#[test]
#[ignore]
fn lock_probe_child() {
    if let Ok(path) = std::env::var(PROBE_ENV) {
        redb::Database::create(&path).expect("open from another process");
    }
}

fn another_process_can_open(path: &Path) -> bool {
    let status = Command::new(std::env::current_exe().expect("test binary path"))
        .args(["lock_probe_child", "--exact", "--ignored", "--test-threads=1"])
        .env(PROBE_ENV, path)
        .output()
        .expect("spawn the probe process")
        .status;
    status.success()
}

fn entry(id: &str) -> VectorEntry {
    VectorEntry {
        id: Some(id.to_string()),
        vector: vec![1.0, 0.0, 0.0],
        metadata: None,
    }
}

#[test]
fn dropping_the_storage_releases_the_file_lock() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("release.db");

    let storage = VectorStorage::new(&path, 3).unwrap();
    storage.insert(&entry("a")).unwrap();
    assert!(!another_process_can_open(&path), "the lock is held while open");

    drop(storage);
    assert!(another_process_can_open(&path), "the lock is released on drop");
}

#[test]
fn the_lock_is_held_until_every_storage_on_the_file_drops() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("shared.db");

    let first = VectorStorage::new(&path, 3).unwrap();
    let second = VectorStorage::new(&path, 3).unwrap();
    first.insert(&entry("a")).unwrap();

    drop(first);
    assert!(!another_process_can_open(&path), "the second storage still holds it");
    assert_eq!(second.len().unwrap(), 1);

    drop(second);
    assert!(another_process_can_open(&path), "released after the last drop");
}

#[test]
fn reopening_an_existing_database_holds_the_lock_until_it_drops() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("vectors.db");
    let options = DbOptions {
        dimensions: 3,
        storage_path: path.to_string_lossy().into_owned(),
        ..DbOptions::default()
    };

    let created = VectorDB::new(options.clone()).unwrap();
    created.insert(entry("a")).unwrap();
    drop(created);

    // An existing database is opened twice: once to read its configuration and
    // once with it. The first handle drops inside `new`; the second must keep
    // the lock until the database drops.
    let reopened = VectorDB::new(options).unwrap();
    assert!(!another_process_can_open(&path), "the open database holds it");
    assert_eq!(reopened.len().unwrap(), 1);

    drop(reopened);
    assert!(another_process_can_open(&path), "released when the database drops");
}
