//! A read-only open never writes its file, shares the file with other readers,
//! and is kept apart from writers by the lock.
//!
//! Locks between processes are checked from a child process, because a second
//! open inside this process is answered by the shared connection pool.

use ruvector_core::storage::VectorStorage;
use ruvector_core::types::DbOptions;
use ruvector_core::{SearchQuery, VectorDB, VectorEntry};
use std::fs::OpenOptions;
use std::path::Path;
use std::process::Command;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tempfile::tempdir;

const ROLE_ENV: &str = "RUVECTOR_READ_ONLY_PROBE_ROLE";
const PATH_ENV: &str = "RUVECTOR_READ_ONLY_PROBE_PATH";
const LOCK_MESSAGE: &str = "Database already open. Cannot acquire lock.";
const READ_ONLY_MESSAGE: &str = "the database is open read-only";
const UNCLEAN_COUNT: usize = 40;

fn options(path: &Path) -> DbOptions {
    DbOptions {
        dimensions: 3,
        storage_path: path.to_string_lossy().into_owned(),
        hnsw_config: None,
        ..DbOptions::default()
    }
}

fn entry(id: &str, vector: [f32; 3]) -> VectorEntry {
    VectorEntry {
        id: Some(id.to_string()),
        vector: vector.to_vec(),
        metadata: None,
    }
}

fn unclean_vector(i: usize) -> [f32; 3] {
    [i as f32, 1.0, (i * i) as f32]
}

fn query(vector: [f32; 3], k: usize) -> SearchQuery {
    SearchQuery {
        vector: vector.to_vec(),
        k,
        filter: None,
        ef_search: None,
    }
}

/// Set the file's modification time far in the past, so any write moves it
/// whatever the file system's timestamp granularity.
fn pin_mtime(path: &Path) {
    let past = UNIX_EPOCH + Duration::from_secs(1_000_000_000);
    OpenOptions::new()
        .write(true)
        .open(path)
        .unwrap()
        .set_modified(past)
        .unwrap();
}

fn snapshot(path: &Path) -> (Vec<u8>, SystemTime) {
    (
        std::fs::read(path).unwrap(),
        std::fs::metadata(path).unwrap().modified().unwrap(),
    )
}

fn assert_unchanged(path: &Path, before: &(Vec<u8>, SystemTime)) {
    let after = snapshot(path);
    assert_eq!(after.1, before.1, "the modification time changed");
    assert!(after.0 == before.0, "the bytes changed");
}

/// A cleanly closed store holding two vectors.
fn closed_store(path: &Path) {
    let db = VectorDB::new(options(path)).unwrap();
    db.insert(entry("a", [1.0, 0.0, 0.0])).unwrap();
    db.insert(entry("b", [0.0, 1.0, 0.0])).unwrap();
}

/// Run in a child process by `probe`: acts out the role named by the
/// environment and prints one `PROBE-OK <n>` or `PROBE-ERR <message>` line.
/// Does nothing when run directly.
#[test]
#[ignore]
fn probe_child() {
    let (Ok(role), Ok(path)) = (std::env::var(ROLE_ENV), std::env::var(PATH_ENV)) else {
        return;
    };
    let outcome = match role.as_str() {
        "open-read-only" => VectorStorage::open_read_only(&path, 3).map(|s| s.len().unwrap()),
        "open-writable" => VectorStorage::new(&path, 3).map(|s| s.len().unwrap()),
        "write-then-exit-unclosed" => {
            let db = VectorDB::new(options(Path::new(&path))).unwrap();
            for i in 0..UNCLEAN_COUNT {
                db.insert(entry(&format!("u{i}"), unclean_vector(i))).unwrap();
            }
            // Exit without dropping the database: redb never clears its
            // recovery flag, as when a writer is killed.
            println!("PROBE-OK {}", db.len().unwrap());
            std::process::exit(0);
        }
        other => panic!("unknown probe role {other}"),
    };
    match outcome {
        Ok(n) => println!("PROBE-OK {n}"),
        Err(e) => println!("PROBE-ERR {e}"),
    }
}

/// Run `probe_child` in a child process; its `Ok` count or `Err` message.
fn probe(role: &str, path: &Path) -> Result<usize, String> {
    let output = Command::new(std::env::current_exe().expect("test binary path"))
        .args(["probe_child", "--exact", "--ignored", "--test-threads=1", "--nocapture"])
        .env(ROLE_ENV, role)
        .env(PATH_ENV, path)
        .output()
        .expect("spawn the probe process");
    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout
        .lines()
        .find_map(|l| l.find("PROBE-").map(|at| &l[at..]))
        .unwrap_or_else(|| {
            panic!(
                "the probe printed no outcome (status {}):\n{stdout}\n{}",
                output.status,
                String::from_utf8_lossy(&output.stderr)
            )
        });
    if let Some(n) = line.strip_prefix("PROBE-OK ") {
        Ok(n.trim().parse().unwrap())
    } else {
        Err(line.trim_start_matches("PROBE-ERR ").to_string())
    }
}

fn assert_lock_refused<T: std::fmt::Debug>(outcome: Result<T, String>, what: &str) {
    let message = outcome.expect_err(what);
    assert!(message.contains(LOCK_MESSAGE), "{what}: {message}");
}

#[test]
fn a_read_only_open_and_search_leaves_a_closed_file_unchanged() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    closed_store(&path);
    pin_mtime(&path);
    let before = snapshot(&path);

    {
        let db = VectorDB::open_read_only(options(&path)).unwrap();
        let results = db.search(query([1.0, 0.0, 0.0], 2)).unwrap();
        assert_eq!(results[0].id, "a");
        assert_eq!(db.len().unwrap(), 2);
    }

    assert_unchanged(&path, &before);
}

#[test]
fn a_read_only_open_reads_a_file_whose_writer_exited_without_closing() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    assert_eq!(probe("write-then-exit-unclosed", &path), Ok(UNCLEAN_COUNT));
    pin_mtime(&path);
    let before = snapshot(&path);

    {
        let db = VectorDB::open_read_only(options(&path)).unwrap();
        assert_eq!(db.len().unwrap(), UNCLEAN_COUNT);
        for i in 0..UNCLEAN_COUNT {
            let stored = db.get(&format!("u{i}")).unwrap().expect("every vector reads back");
            assert_eq!(stored.vector, unclean_vector(i).to_vec());
        }
        let nearest = db.search(query(unclean_vector(7), 1)).unwrap();
        assert_eq!(nearest[0].id, "u7");
    }
    // A second read repeats the recovery in memory and still writes nothing.
    {
        let db = VectorDB::open_read_only(options(&path)).unwrap();
        assert_eq!(db.len().unwrap(), UNCLEAN_COUNT);
    }

    assert_unchanged(&path, &before);
}

#[test]
fn read_only_opens_in_two_processes_coexist() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    closed_store(&path);

    let reader = VectorStorage::open_read_only(&path, 3).unwrap();
    assert_eq!(probe("open-read-only", &path), Ok(2));
    assert_eq!(reader.len().unwrap(), 2);
}

#[test]
fn a_writer_is_refused_while_a_reader_holds_the_file() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    closed_store(&path);

    let reader = VectorStorage::open_read_only(&path, 3).unwrap();
    assert_lock_refused(probe("open-writable", &path), "a writer while a reader holds the file");

    drop(reader);
    assert_eq!(probe("open-writable", &path), Ok(2), "the reader's drop releases the file");
}

#[test]
fn a_reader_is_refused_while_a_writer_holds_the_file() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    closed_store(&path);

    let writer = VectorStorage::new(&path, 3).unwrap();
    assert_lock_refused(probe("open-read-only", &path), "a reader while a writer holds the file");
    drop(writer);
}

#[test]
fn read_only_storage_refuses_every_write() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    closed_store(&path);
    pin_mtime(&path);
    let before = snapshot(&path);

    {
        let storage = VectorStorage::open_read_only(&path, 3).unwrap();
        assert!(storage.is_read_only());
        let refusals = [
            storage.insert(&entry("c", [0.0, 0.0, 1.0])).map(|_| ()),
            storage.insert_batch(&[entry("c", [0.0, 0.0, 1.0])]).map(|_| ()),
            storage.delete("a").map(|_| ()),
            storage.save_config(&options(&path)),
        ];
        for refusal in refusals {
            let message = refusal.expect_err("a write on a read-only storage").to_string();
            assert!(message.contains(READ_ONLY_MESSAGE), "{message}");
        }
        assert_eq!(storage.len().unwrap(), 2);
    }

    assert_unchanged(&path, &before);
}

#[test]
fn read_only_vector_db_refuses_every_write() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    closed_store(&path);

    let db = VectorDB::open_read_only(options(&path)).unwrap();
    let refusals = [
        db.insert(entry("c", [0.0, 0.0, 1.0])).map(|_| ()),
        db.insert_batch(vec![entry("c", [0.0, 0.0, 1.0])]).map(|_| ()),
        db.delete("a").map(|_| ()),
    ];
    for refusal in refusals {
        let message = refusal.expect_err("a write on a read-only database").to_string();
        assert!(message.contains(READ_ONLY_MESSAGE), "{message}");
    }
    assert_eq!(db.len().unwrap(), 2);
    assert_eq!(db.search(query([0.0, 0.0, 1.0], 3)).unwrap().len(), 2);
}

#[test]
fn read_only_open_of_a_file_without_stored_config_uses_the_callers_and_saves_nothing() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    {
        let storage = VectorStorage::new(&path, 3).unwrap();
        storage.insert(&entry("a", [1.0, 0.0, 0.0])).unwrap();
        assert!(storage.load_config().unwrap().is_none());
    }
    pin_mtime(&path);
    let before = snapshot(&path);

    {
        let db = VectorDB::open_read_only(options(&path)).unwrap();
        assert_eq!(db.options().dimensions, 3);
        assert_eq!(db.search(query([1.0, 0.0, 0.0], 1)).unwrap()[0].id, "a");
    }

    assert_unchanged(&path, &before);
    assert!(VectorStorage::open_read_only(&path, 3).unwrap().load_config().unwrap().is_none());
}

#[test]
fn read_only_open_of_a_missing_file_names_it_and_creates_nothing() {
    let dir = tempdir().unwrap();
    let parent = dir.path().join("absent");
    let path = parent.join("store.vectors");

    let storage_error = VectorStorage::open_read_only(&path, 3).err().expect("refused").to_string();
    let db_error = VectorDB::open_read_only(options(&path)).err().expect("refused").to_string();

    for message in [storage_error, db_error] {
        assert!(message.contains(&path.display().to_string()), "{message}");
    }
    assert!(!parent.exists(), "no parent folder was created");
}

#[test]
fn a_writable_open_of_a_store_with_every_table_commits_nothing() {
    // redb leaves a cleanly closed file byte-identical after an open and close
    // that commit nothing, and changes it on any commit, so equal bytes after
    // a writable open and drop prove no transaction was committed.
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    {
        let storage = VectorStorage::new(&path, 3).unwrap();
        storage.insert(&entry("a", [1.0, 0.0, 0.0])).unwrap();
    }
    let before = std::fs::read(&path).unwrap();

    drop(VectorStorage::new(&path, 3).unwrap());
    assert!(std::fs::read(&path).unwrap() == before, "a transaction was committed");

    // A commit does change the bytes, so the check above can fail.
    {
        let storage = VectorStorage::new(&path, 3).unwrap();
        storage.insert(&entry("b", [0.0, 1.0, 0.0])).unwrap();
    }
    assert!(std::fs::read(&path).unwrap() != before);
}

#[test]
fn a_new_file_gets_its_tables() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    drop(VectorStorage::new(&path, 3).unwrap());

    let reader = VectorStorage::open_read_only(&path, 3).unwrap();
    assert_eq!(reader.len().unwrap(), 0);
    assert!(reader.all_ids().unwrap().is_empty());
}

#[test]
fn a_read_only_open_is_refused_while_this_process_holds_the_file_writable() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    let writer = VectorStorage::new(&path, 3).unwrap();
    writer.insert(&entry("a", [1.0, 0.0, 0.0])).unwrap();
    let second_writer = VectorStorage::new(&path, 3).unwrap();

    let message = VectorStorage::open_read_only(&path, 3).err().expect("refused").to_string();
    assert!(message.contains(LOCK_MESSAGE), "{message}");
    let message = VectorDB::open_read_only(options(&path)).err().expect("refused").to_string();
    assert!(message.contains(LOCK_MESSAGE), "{message}");

    // Refused until every writable handle drops.
    drop(writer);
    let message = VectorStorage::open_read_only(&path, 3).err().expect("refused").to_string();
    assert!(message.contains(LOCK_MESSAGE), "{message}");
    drop(second_writer);

    let reader = VectorStorage::open_read_only(&path, 3).unwrap();
    assert_eq!(reader.len().unwrap(), 1);
    // The reader holds only a shared lock, so another process's reader coexists.
    assert_eq!(probe("open-read-only", &path), Ok(1));
}

#[test]
fn a_writable_open_is_refused_while_this_process_holds_the_file_read_only() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    closed_store(&path);

    let reader = VectorStorage::open_read_only(&path, 3).unwrap();
    let second_reader = VectorStorage::open_read_only(&path, 3).unwrap();
    let message = VectorStorage::new(&path, 3).err().expect("refused").to_string();
    assert!(message.contains(LOCK_MESSAGE), "{message}");
    let message = VectorDB::new(options(&path)).err().expect("refused").to_string();
    assert!(message.contains(LOCK_MESSAGE), "{message}");

    // Refused until every read-only handle drops.
    drop(reader);
    let message = VectorStorage::new(&path, 3).err().expect("refused").to_string();
    assert!(message.contains(LOCK_MESSAGE), "{message}");
    drop(second_reader);
    assert_eq!(VectorStorage::new(&path, 3).unwrap().len().unwrap(), 2);
}

fn assert_no_vector_store(outcome: Result<VectorStorage, ruvector_core::RuvectorError>, path: &Path, why: &str) {
    let message = outcome.err().expect("refused").to_string();
    let expected = format!("no vector store at {}: {why}", path.display());
    assert!(message.contains(&expected), "{message}");
}

#[test]
fn a_read_only_open_of_an_empty_file_is_refused_and_leaves_it_empty() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    std::fs::write(&path, b"").unwrap();

    assert_no_vector_store(VectorStorage::open_read_only(&path, 3), &path, "the file is empty");
    let message = VectorDB::open_read_only(options(&path)).err().expect("refused").to_string();
    assert!(message.contains("no vector store at"), "{message}");
    assert_eq!(std::fs::metadata(&path).unwrap().len(), 0);
    // A refused open leaves nothing pooled: a writable open then initialises the file.
    assert_eq!(VectorStorage::new(&path, 3).unwrap().len().unwrap(), 0);
}

#[test]
fn a_read_only_open_of_a_redb_file_without_the_vector_tables_is_refused() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("store.vectors");
    {
        let db = redb::Database::create(&path).unwrap();
        let txn = db.begin_write().unwrap();
        {
            let other: redb::TableDefinition<&str, &str> = redb::TableDefinition::new("other");
            txn.open_table(other).unwrap().insert("k", "v").unwrap();
        }
        txn.commit().unwrap();
    }
    pin_mtime(&path);
    let before = snapshot(&path);

    assert_no_vector_store(VectorStorage::open_read_only(&path, 3), &path, "the file has no vector tables");
    assert_unchanged(&path, &before);
}

#[test]
fn a_read_only_open_of_a_missing_file_says_no_vector_store() {
    let dir = tempdir().unwrap();
    let in_existing_folder = dir.path().join("store.vectors");
    let in_missing_folder = dir.path().join("absent").join("store.vectors");

    assert_no_vector_store(VectorStorage::open_read_only(&in_existing_folder, 3), &in_existing_folder, "the file does not exist");
    assert_no_vector_store(VectorStorage::open_read_only(&in_missing_folder, 3), &in_missing_folder, "the file does not exist");
    assert!(!in_existing_folder.exists());
}

#[cfg(unix)]
fn symlink_dir(target: &Path, link: &Path) {
    std::os::unix::fs::symlink(target, link).unwrap();
}

#[cfg(windows)]
fn symlink_dir(target: &Path, link: &Path) {
    std::os::windows::fs::symlink_dir(target, link).unwrap();
}

#[test]
fn every_spelling_of_one_file_shares_its_pool_entry() {
    let dir = tempdir().unwrap();
    let real = dir.path().join("real");
    std::fs::create_dir(&real).unwrap();
    symlink_dir(&real, &dir.path().join("link"));
    let path = real.join("store.vectors");
    let via_link = dir.path().join("link").join("store.vectors");
    let via_dots = real.join("..").join("real").join("store.vectors");
    closed_store(&path);

    // Two read-only opens under different spellings share one database.
    let reader = VectorStorage::open_read_only(&via_link, 3).unwrap();
    let dotted_reader = VectorStorage::open_read_only(&via_dots, 3).unwrap();
    assert_eq!(dotted_reader.len().unwrap(), 2);
    // A writable open under a third spelling is refused by the pool.
    let message = VectorStorage::new(&path, 3).err().expect("refused").to_string();
    assert!(message.contains(LOCK_MESSAGE), "{message}");
    drop(reader);
    drop(dotted_reader);

    // And the reverse: a writer under one spelling refuses a reader under another.
    let writer = VectorStorage::new(&via_link, 3).unwrap();
    let message = VectorStorage::open_read_only(&via_dots, 3).err().expect("refused").to_string();
    assert!(message.contains(LOCK_MESSAGE), "{message}");
    // Writable opens under different spellings share one database.
    assert_eq!(VectorStorage::new(&path, 3).unwrap().len().unwrap(), 2);
    drop(writer);
}
