//! A redb storage backend that reads a database file and never writes it.
//!
//! redb writes its file header on every open and close, and replays an
//! unclean shutdown on open. Those writes land in an in-memory copy-on-write
//! overlay, so redb reads its own writes while the file stays as it was. The
//! file is opened read-only and held under a shared lock, which coexists with
//! other readers and conflicts with redb's exclusive lock.

use crate::error::{Result, RuvectorError};
use redb::StorageBackend;
use std::collections::HashMap;
use std::fs::{File, OpenOptions, TryLockError};
use std::io;
use std::path::Path;
use std::sync::Mutex;

/// Overlay granularity. A write materialises each block it touches from the
/// file, so a later read of a block sees every write to it, in order.
const BLOCK: u64 = 4096;

#[derive(Debug)]
pub(super) struct ReadOnlyBackend {
    file: File,
    state: Mutex<Overlay>,
}

#[derive(Debug)]
struct Overlay {
    /// The length redb sees.
    len: u64,
    /// File bytes below this offset are current. A shrink lowers it, so bytes
    /// cut off and then grown back read as zeros, as they would in a file.
    /// Never above `len`.
    file_valid: u64,
    /// Every block written since open, by index, with its full content.
    blocks: HashMap<u64, Box<[u8]>>,
}

/// The error a refused lock returns, in redb's own words, so a caller tests
/// one message for a reader and a writer alike.
pub(super) fn lock_held_error() -> RuvectorError {
    redb::DatabaseError::DatabaseAlreadyOpen.into()
}

impl ReadOnlyBackend {
    /// Open `path` read-only under a shared lock. A missing file is an error
    /// naming the path; nothing is created.
    pub(super) fn open(path: &Path) -> Result<Self> {
        let file = OpenOptions::new().read(true).open(path).map_err(|e| {
            if e.kind() == io::ErrorKind::NotFound {
                super::no_vector_store(path, "the file does not exist")
            } else {
                RuvectorError::IoError(e)
            }
        })?;
        match file.try_lock_shared() {
            Ok(()) => {}
            Err(TryLockError::WouldBlock) => return Err(lock_held_error()),
            Err(TryLockError::Error(e)) => return Err(RuvectorError::IoError(e)),
        }
        let len = file.metadata()?.len();
        Ok(Self {
            file,
            state: Mutex::new(Overlay {
                len,
                file_valid: len,
                blocks: HashMap::new(),
            }),
        })
    }

    fn overlay(&self) -> io::Result<std::sync::MutexGuard<'_, Overlay>> {
        self.state
            .lock()
            .map_err(|_| io::Error::other("read-only overlay lock poisoned"))
    }

    /// Fill `buf` with the file's bytes at `offset`, zeros at and above
    /// `file_valid`.
    fn read_file(&self, file_valid: u64, offset: u64, buf: &mut [u8]) -> io::Result<()> {
        buf.fill(0);
        if offset >= file_valid {
            return Ok(());
        }
        let n = ((file_valid - offset) as usize).min(buf.len());
        read_exact_at(&self.file, &mut buf[..n], offset)
    }
}

impl StorageBackend for ReadOnlyBackend {
    fn len(&self) -> io::Result<u64> {
        Ok(self.overlay()?.len)
    }

    /// Copies the overlaid parts of the range out under the overlay lock, and
    /// reads the rest from the file after releasing it, so file reads run in
    /// parallel. The file never changes while it is open: a writer is kept
    /// out by the shared lock.
    fn read(&self, offset: u64, len: usize) -> io::Result<Vec<u8>> {
        let mut out = vec![0u8; len];
        let end = offset + len as u64;
        // Each overlaid run as (start, end) offsets; its bytes are in `out`.
        let mut overlaid = Vec::new();
        let file_valid = {
            let state = self.overlay()?;
            let mut pos = offset;
            while pos < end {
                let block = pos / BLOCK;
                let to = end.min((block + 1) * BLOCK);
                if let Some(data) = state.blocks.get(&block) {
                    let from_in_block = (pos - block * BLOCK) as usize;
                    out[(pos - offset) as usize..(to - offset) as usize]
                        .copy_from_slice(&data[from_in_block..from_in_block + (to - pos) as usize]);
                    overlaid.push((pos, to));
                }
                pos = to;
            }
            state.file_valid
        };
        // One file read for each run of blocks the overlay did not hold.
        let mut pos = offset;
        for (start, stop) in overlaid.into_iter().chain([(end, end)]) {
            if pos < start {
                self.read_file(
                    file_valid,
                    pos,
                    &mut out[(pos - offset) as usize..(start - offset) as usize],
                )?;
            }
            pos = stop;
        }
        Ok(out)
    }

    fn set_len(&self, len: u64) -> io::Result<()> {
        let mut state = self.overlay()?;
        if len < state.len {
            state.file_valid = state.file_valid.min(len);
            state.blocks.retain(|&block, _| block * BLOCK < len);
            let cut = (len % BLOCK) as usize;
            if let Some(data) = state.blocks.get_mut(&(len / BLOCK)) {
                data[cut..].fill(0);
            }
        }
        state.len = len;
        Ok(())
    }

    /// Nothing reaches the file, so there is nothing to sync.
    fn sync_data(&self, _eventual: bool) -> io::Result<()> {
        Ok(())
    }

    fn write(&self, offset: u64, data: &[u8]) -> io::Result<()> {
        let mut state = self.overlay()?;
        let end = offset + data.len() as u64;
        let mut pos = offset;
        while pos < end {
            let block = pos / BLOCK;
            let start = block * BLOCK;
            let to = end.min(start + BLOCK);
            if !state.blocks.contains_key(&block) {
                let mut fresh = vec![0u8; BLOCK as usize].into_boxed_slice();
                self.read_file(state.file_valid, start, &mut fresh)?;
                state.blocks.insert(block, fresh);
            }
            let target = state.blocks.get_mut(&block).expect("block materialised above");
            target[(pos - start) as usize..(to - start) as usize]
                .copy_from_slice(&data[(pos - offset) as usize..(to - offset) as usize]);
            pos = to;
        }
        // A write past the end extends the length, as it does a file.
        state.len = state.len.max(end);
        Ok(())
    }
}

#[cfg(unix)]
fn read_exact_at(file: &File, buf: &mut [u8], offset: u64) -> io::Result<()> {
    use std::os::unix::fs::FileExt;
    file.read_exact_at(buf, offset)
}

#[cfg(windows)]
fn read_exact_at(file: &File, buf: &mut [u8], mut offset: u64) -> io::Result<()> {
    use std::os::windows::fs::FileExt;
    let mut done = 0;
    while done < buf.len() {
        let n = file.seek_read(&mut buf[done..], offset)?;
        if n == 0 {
            return Err(io::Error::new(
                io::ErrorKind::UnexpectedEof,
                "the database file ended early",
            ));
        }
        done += n;
        offset += n as u64;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn backend_over(bytes: &[u8]) -> (tempfile::TempDir, ReadOnlyBackend) {
        let dir = tempdir().unwrap();
        let path = dir.path().join("f");
        std::fs::write(&path, bytes).unwrap();
        let backend = ReadOnlyBackend::open(&path).unwrap();
        (dir, backend)
    }

    #[test]
    fn writes_are_read_back_and_never_reach_the_file() {
        let original: Vec<u8> = (0..3 * BLOCK as usize).map(|i| (i % 251) as u8).collect();
        let (dir, backend) = backend_over(&original);

        // Spans a block boundary, then overlaps it at a different offset.
        backend.write(BLOCK - 2, &[1, 2, 3, 4]).unwrap();
        backend.write(BLOCK - 1, &[9]).unwrap();

        let mut expected = original.clone();
        expected[BLOCK as usize - 2..BLOCK as usize + 2].copy_from_slice(&[1, 9, 3, 4]);
        assert_eq!(backend.read(0, expected.len()).unwrap(), expected);
        assert_eq!(backend.read(BLOCK - 3, 6).unwrap(), expected[BLOCK as usize - 3..BLOCK as usize + 3]);
        assert_eq!(std::fs::read(dir.path().join("f")).unwrap(), original);
    }

    #[test]
    fn a_read_joins_file_blocks_on_both_sides_of_an_overlaid_block() {
        let original: Vec<u8> = (0..4 * BLOCK as usize).map(|i| (i % 253) as u8).collect();
        let (_dir, backend) = backend_over(&original);

        backend.write(BLOCK + 7, &[0xAA; 3]).unwrap();
        backend.write(3 * BLOCK, &[0xBB]).unwrap();

        let mut expected = original.clone();
        expected[BLOCK as usize + 7..BLOCK as usize + 10].fill(0xAA);
        expected[3 * BLOCK as usize] = 0xBB;
        // File, overlay, file, overlay; then a range starting and ending in file blocks.
        assert_eq!(backend.read(0, expected.len()).unwrap(), expected);
        assert_eq!(
            backend.read(BLOCK / 2, 2 * BLOCK as usize).unwrap(),
            expected[BLOCK as usize / 2..BLOCK as usize / 2 + 2 * BLOCK as usize]
        );
    }

    #[test]
    fn length_changes_are_tracked_and_cut_bytes_read_as_zeros() {
        let original = vec![7u8; 2 * BLOCK as usize];
        let (_dir, backend) = backend_over(&original);

        backend.write(BLOCK + 10, &[1, 1]).unwrap();
        backend.set_len(BLOCK + 5).unwrap();
        assert_eq!(backend.len().unwrap(), BLOCK + 5);
        backend.set_len(3 * BLOCK).unwrap();
        assert_eq!(backend.len().unwrap(), 3 * BLOCK);

        let grown = backend.read(BLOCK, 2 * BLOCK as usize).unwrap();
        assert_eq!(&grown[..5], &[7u8; 5]);
        assert!(grown[5..].iter().all(|&b| b == 0), "bytes cut by the shrink read as zeros");

        backend.write(4 * BLOCK, &[5]).unwrap();
        assert_eq!(backend.len().unwrap(), 4 * BLOCK + 1, "a write past the end extends it");
        assert_eq!(backend.read(4 * BLOCK - 1, 2).unwrap(), vec![0, 5]);
    }

    #[test]
    fn a_missing_file_is_refused_with_its_path() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("absent").join("f");
        let err = ReadOnlyBackend::open(&path).unwrap_err().to_string();
        assert!(err.contains(&path.display().to_string()), "{err}");
        assert!(!dir.path().join("absent").exists());
    }
}
