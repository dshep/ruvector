---
name: storage
description: Persistence and snapshots for durable vector storage
tags: [storage, persistence, snapshots, wal, durability]
category: core
priority: P0
---

# Storage Skill

## Overview

Master persistence strategies for durable vector storage including snapshots, write-ahead logging (WAL), memory-mapped files, and compaction for production-grade data safety.

## Available Operations

### 1. Create Snapshot

```bash
# CLI
ruvector-flow storage snapshot create --collection mydata --path /backups/snapshot-001

# MCP Tool
{
  "tool": "snapshot_create",
  "collection": "mydata",
  "path": "/backups/snapshot-001"
}
```

### 2. Restore Snapshot

```bash
# CLI
ruvector-flow storage snapshot restore --collection mydata --path /backups/snapshot-001

# MCP Tool
{
  "tool": "snapshot_restore",
  "collection": "mydata",
  "path": "/backups/snapshot-001"
}
```

### 3. List Snapshots

```bash
# CLI
ruvector-flow storage snapshot list --collection mydata

# MCP Tool
{
  "tool": "snapshot_list",
  "collection": "mydata"
}
```

### 4. Enable WAL

```bash
# CLI
ruvector-flow storage wal enable --collection mydata --fsync-interval 1000

# MCP Tool
{
  "tool": "wal_enable",
  "collection": "mydata",
  "fsync_interval": 1000
}
```

### 5. Replay WAL

```bash
# CLI
ruvector-flow storage wal replay --collection mydata

# MCP Tool
{
  "tool": "wal_replay",
  "collection": "mydata"
}
```

### 6. Memory Mapping

```bash
# CLI
ruvector-flow storage mmap --collection mydata --enabled true

# MCP Tool
{
  "tool": "storage_mmap",
  "collection": "mydata",
  "enabled": true
}
```

### 7. Compaction

```bash
# CLI
ruvector-flow storage compact --collection mydata

# MCP Tool
{
  "tool": "storage_compact",
  "collection": "mydata"
}
```

## Example Usage

### Production Storage Configuration

```typescript
import { RuvectorFlow } from '@ruvector/flow';

const db = new RuvectorFlow({
  storage: {
    path: '/var/lib/ruvector/data',
    engine: 'mmap',  // Memory-mapped for performance

    // Write-Ahead Log for durability
    wal: {
      enabled: true,
      path: '/var/lib/ruvector/wal',
      fsyncInterval: 1000,  // Fsync every 1s
      maxSegmentSize: 256 * 1024 * 1024  // 256MB segments
    },

    // Snapshots for backup
    snapshots: {
      enabled: true,
      path: '/var/lib/ruvector/snapshots',
      interval: 3600000,  // Hourly snapshots
      retention: 7  // Keep 7 snapshots
    },

    // Compaction for efficiency
    compaction: {
      enabled: true,
      interval: 86400000,  // Daily compaction
      minFragmentation: 0.3  // Compact if >30% fragmented
    }
  }
});

await db.init();
```

### Snapshot Management

```typescript
// Create manual snapshot
async function createBackup(collection: string, reason: string) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const snapshotPath = `/backups/${collection}/${timestamp}`;

  const snapshot = await db.storage.snapshotCreate({
    collection,
    path: snapshotPath,
    metadata: {
      reason,
      timestamp: Date.now(),
      vectorCount: (await db.vector.count({ collection }))
    }
  });

  console.log(`Snapshot created: ${snapshotPath}`);
  console.log(`  Size: ${snapshot.sizeMB}MB`);
  console.log(`  Vectors: ${snapshot.vectorCount}`);

  return snapshot;
}

// Restore from snapshot
async function restoreBackup(collection: string, snapshotPath: string) {
  console.log(`Restoring ${collection} from ${snapshotPath}...`);

  // Stop writes
  await db.collection.setReadOnly({ name: collection, readOnly: true });

  // Restore
  await db.storage.snapshotRestore({
    collection,
    path: snapshotPath
  });

  // Resume writes
  await db.collection.setReadOnly({ name: collection, readOnly: false });

  console.log('Restore complete');
}

// List available snapshots
async function listBackups(collection: string) {
  const snapshots = await db.storage.snapshotList({ collection });

  console.table(snapshots.map(s => ({
    Path: s.path,
    Created: new Date(s.createdAt).toLocaleString(),
    Size: `${s.sizeMB}MB`,
    Vectors: s.vectorCount
  })));

  return snapshots;
}
```

### Write-Ahead Logging

```typescript
// Enable WAL for crash recovery
await db.storage.walEnable({
  collection: 'critical_data',
  fsyncInterval: 100,  // Aggressive fsync (every 100ms)
  compression: true    // Compress WAL segments
});

// Simulate crash and recovery
async function crashRecovery(collection: string) {
  console.log('Simulating crash recovery...');

  // 1. Detect unfinished WAL segments
  const walStatus = await db.storage.walStatus({ collection });

  if (walStatus.unreplayedSegments > 0) {
    console.log(`Found ${walStatus.unreplayedSegments} unreplayed segments`);

    // 2. Replay WAL
    const replayed = await db.storage.walReplay({
      collection,
      fromSegment: walStatus.lastReplayedSegment
    });

    console.log(`Replayed ${replayed.operations} operations`);
  }

  // 3. Verify consistency
  const stats = await db.collection.stats({ name: collection });
  console.log(`Collection recovered: ${stats.vectorCount} vectors`);
}

// Monitor WAL size
async function monitorWAL() {
  const collections = await db.collection.list();

  for (const collection of collections) {
    const walStatus = await db.storage.walStatus({ collection: collection.name });

    console.log(`${collection.name}:
      Segments: ${walStatus.segmentCount}
      Size: ${walStatus.totalSizeMB}MB
      Unreplayed: ${walStatus.unreplayedSegments}
    `);

    // Cleanup old segments
    if (walStatus.segmentCount > 100) {
      await db.storage.walCompact({ collection: collection.name });
    }
  }
}
```

### Memory-Mapped Storage

```typescript
// Enable mmap for large collections
await db.storage.mmapEnable({
  collection: 'large_vectors',
  advice: 'random'  // MADV_RANDOM for vector search patterns
});

// Monitor mmap usage
async function monitorMmap() {
  const mmapStats = await db.storage.mmapStats({
    collection: 'large_vectors'
  });

  console.log(`
Memory-Mapped Storage:
  Mapped Size: ${mmapStats.mappedSizeGB}GB
  Resident: ${mmapStats.residentSizeGB}GB
  Page Faults: ${mmapStats.pageFaults}
  Cache Hit Rate: ${mmapStats.cacheHitRate}%
  `);

  // Prefetch frequently accessed regions
  if (mmapStats.cacheHitRate < 0.9) {
    await db.storage.mmapPrefetch({
      collection: 'large_vectors',
      regions: mmapStats.hotRegions
    });
  }
}
```

### Compaction

```typescript
// Manual compaction
async function compactCollection(collection: string) {
  const statsBefore = await db.collection.stats({ name: collection });

  console.log(`Starting compaction of ${collection}...`);
  console.log(`  Current size: ${statsBefore.diskUsageMB}MB`);
  console.log(`  Fragmentation: ${statsBefore.fragmentation}%`);

  const result = await db.storage.compact({
    collection,
    vacuum: true  // Reclaim deleted space
  });

  console.log(`Compaction complete:
    Size before: ${result.sizeBefore}MB
    Size after: ${result.sizeAfter}MB
    Reclaimed: ${result.reclaimedMB}MB
    Duration: ${result.durationMs}ms
  `);
}

// Automatic compaction
async function autoCompaction() {
  const collections = await db.collection.list();

  for (const collection of collections) {
    const stats = await db.collection.stats({ name: collection.name });

    // Compact if >30% fragmented
    if (stats.fragmentation > 0.3) {
      await compactCollection(collection.name);
    }
  }
}

// Schedule daily compaction
setInterval(autoCompaction, 24 * 60 * 60 * 1000);
```

### Disaster Recovery

```typescript
// Complete backup strategy
class BackupStrategy {
  private db: RuvectorFlow;

  async fullBackup(collection: string) {
    // 1. Create snapshot
    const snapshot = await this.db.storage.snapshotCreate({
      collection,
      path: `/backups/full/${Date.now()}`
    });

    // 2. Archive WAL segments
    const walSegments = await this.db.storage.walExport({
      collection,
      format: 'tar.gz'
    });

    // 3. Upload to remote storage
    await this.uploadToS3(snapshot.path, walSegments);

    return snapshot;
  }

  async incrementalBackup(collection: string, lastBackupTime: number) {
    // Backup only WAL segments since last backup
    const segments = await this.db.storage.walExport({
      collection,
      since: lastBackupTime
    });

    await this.uploadToS3(segments);

    return segments;
  }

  async restorePointInTime(collection: string, timestamp: number) {
    // 1. Find last snapshot before timestamp
    const snapshots = await this.db.storage.snapshotList({ collection });
    const snapshot = snapshots.reverse().find(s => s.createdAt <= timestamp);

    if (!snapshot) {
      throw new Error('No snapshot found before timestamp');
    }

    // 2. Restore snapshot
    await this.db.storage.snapshotRestore({
      collection,
      path: snapshot.path
    });

    // 3. Replay WAL to timestamp
    await this.db.storage.walReplay({
      collection,
      until: timestamp
    });

    console.log(`Restored ${collection} to ${new Date(timestamp).toISOString()}`);
  }

  private async uploadToS3(path: string, segments?: any) {
    // Upload to S3/cloud storage
    // Implementation depends on cloud provider
  }
}
```

### Storage Migration

```typescript
// Migrate between storage engines
async function migrateStorage(
  collection: string,
  fromEngine: string,
  toEngine: string
) {
  console.log(`Migrating ${collection} from ${fromEngine} to ${toEngine}`);

  // 1. Create snapshot with current engine
  const snapshot = await db.storage.snapshotCreate({
    collection,
    path: `/tmp/migration-${collection}`
  });

  // 2. Stop writes
  await db.collection.setReadOnly({ name: collection, readOnly: true });

  // 3. Change storage engine
  await db.storage.configure({
    collection,
    engine: toEngine
  });

  // 4. Restore from snapshot
  await db.storage.snapshotRestore({
    collection,
    path: snapshot.path
  });

  // 5. Resume writes
  await db.collection.setReadOnly({ name: collection, readOnly: false });

  // 6. Cleanup
  await db.storage.snapshotDelete({ path: snapshot.path });

  console.log('Migration complete');
}
```

## Best Practices

### 1. Storage Engine Selection

| Engine | Use Case | Pros | Cons |
|--------|----------|------|------|
| In-Memory | Development, caching | Fastest | No persistence |
| Mmap | Production (SSD) | Fast, less RAM | Requires disk space |
| Embedded DB | Production | Durable, compressed | Slightly slower |

### 2. Snapshot Strategy
```typescript
// Tiered snapshot retention
const snapshotPolicy = {
  hourly: { retention: 24, interval: 3600000 },      // Last 24 hours
  daily: { retention: 7, interval: 86400000 },       // Last 7 days
  weekly: { retention: 4, interval: 604800000 },     // Last 4 weeks
  monthly: { retention: 12, interval: 2592000000 }   // Last 12 months
};
```

### 3. WAL Configuration
```typescript
// Balance durability vs performance
const walConfig = {
  // Maximum durability (financial data)
  maxDurability: {
    fsyncInterval: 0,  // Fsync every write
    compression: false
  },

  // Balanced (recommended)
  balanced: {
    fsyncInterval: 1000,  // Fsync every 1s
    compression: true
  },

  // Performance (analytics)
  performance: {
    fsyncInterval: 10000,  // Fsync every 10s
    compression: true
  }
};
```

### 4. Disk Space Management
```typescript
// Monitor disk usage
async function monitorDiskSpace() {
  const usage = await db.storage.diskUsage();

  console.log(`
Storage Usage:
  Data: ${usage.dataGB}GB
  WAL: ${usage.walGB}GB
  Snapshots: ${usage.snapshotsGB}GB
  Total: ${usage.totalGB}GB
  Available: ${usage.availableGB}GB
  `);

  // Alert if low space
  if (usage.availableGB < 10) {
    console.error('Low disk space!');
    await cleanupOldSnapshots();
    await compactWAL();
  }
}
```

### 5. Performance Optimization
```typescript
// Optimize for SSD
await db.storage.configure({
  engine: 'mmap',
  mmap: {
    advice: 'random',      // MADV_RANDOM for SSDs
    hugepages: true,       // Use huge pages if available
    populate: false        // Don't populate on startup
  }
});

// Optimize for HDD
await db.storage.configure({
  engine: 'mmap',
  mmap: {
    advice: 'sequential',  // MADV_SEQUENTIAL for HDDs
    hugepages: false,
    populate: true,        // Pre-populate for sequential access
    readahead: 128         // Larger readahead for HDDs
  }
});
```

## Monitoring

```typescript
// Storage health dashboard
async function storageHealthCheck() {
  const collections = await db.collection.list();

  for (const collection of collections) {
    const stats = await db.storage.stats({ collection: collection.name });

    console.log(`${collection.name}:
      Engine: ${stats.engine}
      Disk Usage: ${stats.diskUsageGB}GB
      Fragmentation: ${stats.fragmentation}%
      WAL Segments: ${stats.walSegments}
      Snapshot Count: ${stats.snapshotCount}
      Last Backup: ${new Date(stats.lastBackup).toLocaleString()}
      Last Compaction: ${new Date(stats.lastCompaction).toLocaleString()}
    `);

    // Health checks
    if (stats.fragmentation > 0.5) {
      console.warn(`  ⚠ High fragmentation, run compaction`);
    }
    if (stats.walSegments > 100) {
      console.warn(`  ⚠ Many WAL segments, run cleanup`);
    }
    if (Date.now() - stats.lastBackup > 86400000) {
      console.warn(`  ⚠ No backup in 24h`);
    }
  }
}
```

## Troubleshooting

### High Disk Usage
- Run compaction
- Delete old snapshots
- Cleanup WAL segments
- Enable compression

### Slow Writes
- Reduce fsync frequency
- Use batch operations
- Check disk I/O
- Enable write cache

### Recovery Failures
- Verify WAL integrity
- Check snapshot corruption
- Review error logs
- Use older snapshot

### Memory Issues (Mmap)
- Check available RAM
- Reduce mmap regions
- Use smaller pages
- Switch to embedded DB

## Related Skills
- `vector-operations` - Operations that generate WAL entries
- `cluster-management` - Distributed storage
- `metrics` - Storage monitoring
- `benchmarking` - Storage performance testing
