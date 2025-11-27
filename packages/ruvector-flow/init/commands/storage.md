# Storage and Persistence Commands

Storage management, snapshots, and Write-Ahead Log (WAL) operations.

## Commands

### /storage snapshot create

Create a snapshot of a collection or entire database.

**Syntax:**
```bash
/storage snapshot create [collection] [options]
```

**Arguments:**
- `[collection]` - Collection name (optional, creates full snapshot if omitted)
- `--path <path>` - Snapshot output path (default: ./snapshots)
- `--compress` - Enable compression (gzip)
- `--incremental` - Incremental snapshot (only changes since last snapshot)

**Example:**
```bash
/storage snapshot create products --path /backups/snapshots
/storage snapshot create --compress
/storage snapshot create embeddings --incremental --compress
```

**Returns:**
```json
{
  "snapshot_id": "snap-2024-01-20-103045",
  "type": "full",
  "collections": ["products"],
  "vectors": 100000,
  "size_bytes": 52428800,
  "compressed": true,
  "path": "/backups/snapshots/snap-2024-01-20-103045.gz",
  "duration_ms": 5432,
  "status": "completed"
}
```

---

### /storage snapshot restore

Restore a collection or database from a snapshot.

**Syntax:**
```bash
/storage snapshot restore <snapshot> [options]
```

**Arguments:**
- `<snapshot>` - Snapshot file path or snapshot ID
- `--collection <name>` - Target collection name (optional, restore to original if omitted)
- `--overwrite` - Overwrite existing collection
- `--verify` - Verify snapshot integrity before restore

**Example:**
```bash
/storage snapshot restore /backups/snapshots/snap-2024-01-20-103045.gz
/storage snapshot restore snap-2024-01-20-103045 --collection products-restored
/storage snapshot restore /backups/latest.snap --overwrite --verify
```

**Returns:**
```json
{
  "snapshot_id": "snap-2024-01-20-103045",
  "collections_restored": ["products"],
  "vectors_restored": 100000,
  "duration_ms": 3210,
  "status": "completed"
}
```

---

### /storage snapshot list

List all available snapshots.

**Syntax:**
```bash
/storage snapshot list [options]
```

**Arguments:**
- `--path <path>` - Snapshot directory (default: ./snapshots)
- `--collection <name>` - Filter by collection

**Example:**
```bash
/storage snapshot list
/storage snapshot list --path /backups/snapshots
/storage snapshot list --collection products
```

**Returns:**
```json
{
  "snapshots": [
    {
      "id": "snap-2024-01-20-103045",
      "type": "full",
      "collections": ["products"],
      "vectors": 100000,
      "size_bytes": 52428800,
      "compressed": true,
      "created_at": "2024-01-20T10:30:45Z",
      "path": "/backups/snapshots/snap-2024-01-20-103045.gz"
    },
    {
      "id": "snap-2024-01-19-080000",
      "type": "incremental",
      "collections": ["products"],
      "vectors": 5000,
      "size_bytes": 2621440,
      "compressed": true,
      "created_at": "2024-01-19T08:00:00Z",
      "path": "/backups/snapshots/snap-2024-01-19-080000.gz"
    }
  ],
  "total": 2
}
```

---

### /storage wal enable

Enable Write-Ahead Log for durability.

**Syntax:**
```bash
/storage wal enable [options]
```

**Arguments:**
- `--path <path>` - WAL directory (default: ./wal)
- `--sync-mode <mode>` - Sync mode: fsync, async, periodic (default: fsync)
- `--segment-size <bytes>` - WAL segment size (default: 64MB)
- `--retention <duration>` - WAL retention period (default: 24h)

**Example:**
```bash
/storage wal enable
/storage wal enable --path /data/wal --sync-mode fsync
/storage wal enable --segment-size 134217728 --retention 48h
```

**Returns:**
```json
{
  "wal_enabled": true,
  "path": "/data/wal",
  "sync_mode": "fsync",
  "segment_size_bytes": 67108864,
  "retention": "24h",
  "status": "active"
}
```

---

### /storage wal replay

Replay Write-Ahead Log to recover data.

**Syntax:**
```bash
/storage wal replay [options]
```

**Arguments:**
- `--path <path>` - WAL directory (default: ./wal)
- `--from <timestamp>` - Replay from timestamp
- `--to <timestamp>` - Replay to timestamp
- `--verify` - Verify WAL integrity before replay

**Example:**
```bash
/storage wal replay
/storage wal replay --path /data/wal --verify
/storage wal replay --from "2024-01-20T10:00:00Z" --to "2024-01-20T11:00:00Z"
```

**Returns:**
```json
{
  "segments_replayed": 5,
  "operations_replayed": 50000,
  "collections_affected": ["products", "embeddings"],
  "duration_ms": 8765,
  "status": "completed"
}
```

---

### /storage mmap

Configure memory-mapped file storage.

**Syntax:**
```bash
/storage mmap [options]
```

**Arguments:**
- `--enable` - Enable mmap storage
- `--disable` - Disable mmap storage
- `--advise <mode>` - madvise mode: normal, random, sequential (default: random)
- `--populate` - Populate page tables on mmap (prefault)

**Example:**
```bash
/storage mmap --enable --advise sequential
/storage mmap --enable --populate
/storage mmap --disable
```

**Returns:**
```json
{
  "mmap_enabled": true,
  "advise_mode": "sequential",
  "populate": false,
  "total_mapped_bytes": 1073741824,
  "resident_bytes": 536870912
}
```

---

### /storage compact

Compact storage to reclaim space.

**Syntax:**
```bash
/storage compact [collection] [options]
```

**Arguments:**
- `[collection]` - Collection name (optional, compacts all if omitted)
- `--aggressive` - Aggressive compaction (slower, more space savings)
- `--threshold <percent>` - Compaction threshold (default: 20%)

**Example:**
```bash
/storage compact products
/storage compact --aggressive
/storage compact embeddings --threshold 30
```

**Returns:**
```json
{
  "collections_compacted": ["products"],
  "before_size_bytes": 157286400,
  "after_size_bytes": 125829120,
  "freed_bytes": 31457280,
  "reduction_percent": 20.0,
  "duration_ms": 12345,
  "status": "completed"
}
```

---

## Storage Backends

### Memory Storage
**Characteristics:**
- Fastest performance
- Volatile (data lost on restart)
- Limited by RAM

**Use cases:**
- Caching
- Temporary data
- Development/testing

**Configuration:**
```bash
/collection create cache -d 384 --storage memory
```

---

### Disk Storage (mmap)
**Characteristics:**
- Persistent
- OS-managed caching
- Good performance with SSD

**Use cases:**
- Production databases
- Large datasets
- Cost-effective storage

**Configuration:**
```bash
/collection create products -d 384 --on-disk
/storage mmap --enable --advise random
```

---

### Hybrid Storage
**Characteristics:**
- Hot data in memory
- Cold data on disk
- Automatic tiering

**Use cases:**
- Large datasets with access patterns
- Cost optimization
- Performance tuning

**Configuration:**
```bash
/collection create hybrid -d 384 --storage hybrid --hot-tier-size 10GB
```

---

## Write-Ahead Log (WAL)

### Purpose
- Durability guarantee
- Crash recovery
- Point-in-time recovery
- Replication

### Sync Modes

#### fsync (Safest)
- Each write synced to disk
- Guaranteed durability
- Slower performance
- **Use for**: Critical data

#### async (Fastest)
- Writes buffered in memory
- Periodic flush
- Risk of data loss on crash
- **Use for**: Non-critical data

#### periodic (Balanced)
- Flush every N seconds
- Balance of safety and performance
- **Use for**: Most applications

### WAL Management
```bash
# Enable with fsync for safety
/storage wal enable --sync-mode fsync

# Enable with periodic flush every 5s
/storage wal enable --sync-mode periodic --flush-interval 5s

# Replay after crash
/storage wal replay --verify
```

---

## Snapshot Strategy

### Full Snapshots
- Complete database copy
- Baseline for recovery
- Larger size, longer creation time

**Schedule:** Daily or weekly

### Incremental Snapshots
- Only changes since last snapshot
- Faster, smaller
- Requires full snapshot as base

**Schedule:** Hourly or every few hours

### Example Backup Strategy
```bash
# Daily full snapshot at 2 AM
0 2 * * * /storage snapshot create --compress --path /backups/daily

# Hourly incremental snapshots
0 * * * * /storage snapshot create --incremental --compress --path /backups/hourly

# Weekly full snapshot to off-site storage
0 2 * * 0 /storage snapshot create --compress --path /backups/weekly
```

---

## Storage Optimization

### Compaction
Run compaction when:
- Delete rate is high (>20%)
- After large batch deletes
- Storage costs are concern
- Performance degradation observed

### mmap Tuning
```bash
# For random access (vector search)
/storage mmap --enable --advise random

# For sequential scans
/storage mmap --enable --advise sequential

# Prefault pages for predictable latency
/storage mmap --enable --populate
```

### WAL Retention
```bash
# Keep WAL for 24h (default)
/storage wal enable --retention 24h

# Extended retention for compliance
/storage wal enable --retention 168h  # 1 week
```

---

## Disaster Recovery

### Backup Procedure
1. Create full snapshot
2. Transfer to off-site storage
3. Verify snapshot integrity
4. Document recovery process

### Recovery Procedure
1. Stop application
2. Restore snapshot
3. Replay WAL if needed
4. Verify data integrity
5. Resume application

### Example Recovery
```bash
# 1. Restore from snapshot
/storage snapshot restore /backups/snap-2024-01-20-020000.gz --verify

# 2. Replay WAL since snapshot
/storage wal replay --from "2024-01-20T02:00:00Z"

# 3. Verify data
/collection stats products
```

---

## Performance Tuning

### SSD Optimization
- Enable mmap with random advise
- Use larger WAL segments (128MB+)
- Enable compression for snapshots

### HDD Optimization
- Use sequential advise for mmap
- Smaller WAL segments (32MB)
- Schedule compaction during low traffic

### Memory Optimization
- Use memory storage for hot data
- Enable compression
- Regular compaction

---

## Common Options

- `--format <format>` - Output format: json, table (default: json)
- `--verbose, -v` - Verbose output with detailed progress
- `--help, -h` - Show command help

## Notes

- Always verify snapshots after creation
- WAL replay is idempotent (safe to run multiple times)
- Compaction doesn't block reads/writes
- mmap requires sufficient virtual address space
- Compression reduces storage by 50-70% with minimal CPU overhead
- Incremental snapshots require previous full snapshot
- WAL segments are rotated automatically
