//! `enumerate` lists every stored entry with its id, vector and metadata, in
//! id order, on a writable and a read-only open, and writes nothing.

use ruvector_core::storage::VectorStorage;
use ruvector_core::types::DbOptions;
use ruvector_core::{VectorDB, VectorEntry};
use serde_json::json;
use std::collections::HashMap;
use std::fs::OpenOptions;
use std::path::Path;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tempfile::tempdir;

fn options(path: &Path) -> DbOptions {
    DbOptions {
        dimensions: 3,
        storage_path: path.to_string_lossy().into_owned(),
        hnsw_config: None,
        ..DbOptions::default()
    }
}

fn metadata(value: serde_json::Value) -> HashMap<String, serde_json::Value> {
    serde_json::from_value(value).unwrap()
}

/// Three entries inserted out of id order, one without metadata.
fn sample() -> Vec<VectorEntry> {
    vec![
        VectorEntry {
            id: Some("doc:2".to_string()),
            vector: vec![0.0, 1.0, 0.5],
            metadata: Some(metadata(json!({"type": "doc", "n": 2, "tags": ["a", "b"]}))),
        },
        VectorEntry {
            id: Some("ep-1".to_string()),
            vector: vec![1.0, 0.0, -0.25],
            metadata: None,
        },
        VectorEntry {
            id: Some("doc:10".to_string()),
            vector: vec![0.125, 0.25, 0.75],
            metadata: Some(metadata(json!({"type": "doc", "nested": {"k": true}}))),
        },
    ]
}

fn by_id(
    entries: &[VectorEntry],
) -> Vec<(String, Vec<f32>, Option<HashMap<String, serde_json::Value>>)> {
    let mut rows: Vec<_> = entries
        .iter()
        .map(|e| (e.id.clone().unwrap(), e.vector.clone(), e.metadata.clone()))
        .collect();
    rows.sort_by(|a, b| a.0.cmp(&b.0));
    rows
}

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

#[test]
fn enumerate_lists_every_entry_with_id_vector_and_metadata_in_id_order() {
    let dir = tempdir().unwrap();
    let db = VectorDB::new(options(&dir.path().join("e.db"))).unwrap();
    db.insert_batch(sample()).unwrap();

    let listed = db.enumerate().unwrap();

    let ids: Vec<_> = listed.iter().map(|e| e.id.clone().unwrap()).collect();
    assert_eq!(ids, vec!["doc:10", "doc:2", "ep-1"], "id order");
    assert_eq!(by_id(&listed), by_id(&sample()));
}

#[test]
fn enumerate_agrees_with_get_for_every_entry() {
    let dir = tempdir().unwrap();
    let db = VectorDB::new(options(&dir.path().join("e.db"))).unwrap();
    db.insert_batch(sample()).unwrap();

    for entry in db.enumerate().unwrap() {
        let got = db.get(entry.id.as_deref().unwrap()).unwrap().unwrap();
        assert_eq!(got.id, entry.id);
        assert_eq!(got.vector, entry.vector);
        assert_eq!(got.metadata, entry.metadata);
    }
}

#[test]
fn enumerate_of_an_empty_store_is_empty() {
    let dir = tempdir().unwrap();
    let db = VectorDB::new(options(&dir.path().join("empty.db"))).unwrap();
    assert!(db.enumerate().unwrap().is_empty());
}

#[test]
fn enumerate_leaves_out_a_deleted_entry_and_shows_a_replaced_one() {
    let dir = tempdir().unwrap();
    let db = VectorDB::new(options(&dir.path().join("e.db"))).unwrap();
    db.insert_batch(sample()).unwrap();
    assert!(db.delete("ep-1").unwrap());
    db.insert(VectorEntry {
        id: Some("doc:2".to_string()),
        vector: vec![9.0, 9.0, 9.0],
        metadata: Some(metadata(json!({"type": "doc", "n": 3}))),
    })
    .unwrap();

    let listed = db.enumerate().unwrap();
    let ids: Vec<_> = listed.iter().map(|e| e.id.clone().unwrap()).collect();
    assert_eq!(ids, vec!["doc:10", "doc:2"]);
    assert_eq!(listed[1].vector, vec![9.0, 9.0, 9.0]);
    assert_eq!(
        listed[1].metadata,
        Some(metadata(json!({"type": "doc", "n": 3})))
    );
}

#[test]
fn enumerate_on_a_read_only_open_lists_every_entry_and_writes_nothing() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("ro.db");
    {
        let db = VectorDB::new(options(&path)).unwrap();
        db.insert_batch(sample()).unwrap();
    }
    pin_mtime(&path);
    let before = snapshot(&path);

    {
        let db = VectorDB::open_read_only(options(&path)).unwrap();
        let listed = db.enumerate().unwrap();
        assert_eq!(by_id(&listed), by_id(&sample()));
    }

    let after = snapshot(&path);
    assert_eq!(after.1, before.1, "the modification time changed");
    assert!(after.0 == before.0, "the bytes changed");
}

#[test]
fn enumerate_on_a_read_only_open_of_an_empty_store_is_empty() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("ro-empty.db");
    drop(VectorDB::new(options(&path)).unwrap());

    let db = VectorDB::open_read_only(options(&path)).unwrap();
    assert!(db.enumerate().unwrap().is_empty());
}

#[test]
fn storage_enumerate_matches_vector_db_enumerate() {
    let dir = tempdir().unwrap();
    let storage = VectorStorage::new(dir.path().join("s.db"), 3).unwrap();
    storage.insert_batch(&sample()).unwrap();
    assert_eq!(by_id(&storage.enumerate().unwrap()), by_id(&sample()));
}
