---
name: index-management
description: HNSW index operations for 150x faster vector search
tags: [hnsw, index, search, performance, optimization]
category: core
priority: P0
---

# Index Management Skill

## Overview

Master HNSW (Hierarchical Navigable Small World) index management for ultra-fast approximate nearest neighbor search. Achieve 150x faster search compared to brute-force while maintaining >95% recall.

## Available Operations

### 1. Create HNSW Index

```bash
# CLI
ruvector-flow index create hnsw --collection mydata --m 16 --ef-construction 200

# MCP Tool
{
  "tool": "index_create_hnsw",
  "collection": "mydata",
  "m": 16,
  "ef_construction": 200,
  "metric": "cosine"
}
```

### 2. Create Flat Index (Brute Force)

```bash
# CLI
ruvector-flow index create flat --collection mydata

# MCP Tool
{
  "tool": "index_create_flat",
  "collection": "mydata"
}
```

### 3. Build Index

```bash
# CLI
ruvector-flow index build --collection mydata --parallel true

# MCP Tool
{
  "tool": "index_build",
  "collection": "mydata",
  "parallel": true
}
```

### 4. Index Statistics

```bash
# CLI
ruvector-flow index stats --collection mydata

# MCP Tool
{
  "tool": "index_stats",
  "collection": "mydata"
}
```

### 5. Optimize Index

```bash
# CLI
ruvector-flow index optimize --collection mydata

# MCP Tool
{
  "tool": "index_optimize",
  "collection": "mydata"
}
```

### 6. Rebuild Index

```bash
# CLI
ruvector-flow index rebuild --collection mydata --m 32 --ef-construction 400

# MCP Tool
{
  "tool": "index_rebuild",
  "collection": "mydata",
  "m": 32,
  "ef_construction": 400
}
```

### 7. Delete Index

```bash
# CLI
ruvector-flow index delete --collection mydata

# MCP Tool
{
  "tool": "index_delete",
  "collection": "mydata"
}
```

## HNSW Parameters

### M (Number of Connections)
- **Low (8-12)**: Less memory, slightly lower recall
- **Medium (16-24)**: Balanced performance (recommended)
- **High (32-64)**: Best recall, more memory

### ef_construction
- **Low (100-200)**: Faster index build
- **Medium (200-400)**: Balanced (recommended)
- **High (400-800)**: Better quality, slower build

### ef_search
- **Low (k-2k)**: Faster search, lower recall
- **Medium (2k-4k)**: Balanced (recommended)
- **High (4k-8k)**: Best recall, slower search

## Example Usage

### Production Setup

```typescript
import { RuvectorFlow } from '@ruvector/flow';

const db = new RuvectorFlow();

// 1. Create collection
await db.collection.create({
  name: 'prod_embeddings',
  dimension: 1536,
  metric: 'cosine'
});

// 2. Create HNSW index with production settings
await db.index.createHNSW({
  collection: 'prod_embeddings',
  m: 16,                    // Balanced connections
  efConstruction: 200,      // Good build quality
  metric: 'cosine'
});

// 3. Insert vectors (index builds automatically)
await db.vector.insertBatch({
  collection: 'prod_embeddings',
  vectors: embeddings,
  batchSize: 1000
});

// 4. Optimize after bulk insert
await db.index.optimize({
  collection: 'prod_embeddings'
});

// 5. Search with tuned ef_search
const results = await db.vector.search({
  collection: 'prod_embeddings',
  query: queryVector,
  k: 10,
  efSearch: 100  // 10x k for good recall
});
```

### High-Recall Configuration

```typescript
// For applications requiring >99% recall
await db.index.createHNSW({
  collection: 'high_precision',
  m: 32,              // More connections
  efConstruction: 400  // Better build quality
});

// Search with high ef_search
const results = await db.vector.search({
  collection: 'high_precision',
  query: queryVector,
  k: 10,
  efSearch: 500  // 50x k for maximum recall
});
```

### Low-Latency Configuration

```typescript
// For applications requiring <10ms latency
await db.index.createHNSW({
  collection: 'fast_search',
  m: 12,              // Fewer connections
  efConstruction: 100  // Faster build
});

// Search with low ef_search
const results = await db.vector.search({
  collection: 'fast_search',
  query: queryVector,
  k: 10,
  efSearch: 20  // 2x k for speed
});
```

### Index Monitoring

```typescript
// Monitor index health
const stats = await db.index.stats({
  collection: 'mydata'
});

console.log(`
Index Type: ${stats.type}
Vector Count: ${stats.vectorCount}
Memory Usage: ${stats.memoryMB}MB
Build Time: ${stats.buildTimeMs}ms
Avg Search Time: ${stats.avgSearchMs}ms
Avg Recall: ${stats.avgRecall}
`);

// Rebuild if performance degrades
if (stats.avgRecall < 0.95 || stats.avgSearchMs > 50) {
  console.log('Index performance degraded, rebuilding...');
  await db.index.rebuild({
    collection: 'mydata',
    m: 24,  // Increase quality
    efConstruction: 400
  });
}
```

### Progressive Index Building

```typescript
// Build index progressively for large datasets
const BATCH_SIZE = 100000;
const totalVectors = 10000000;

// Start with flat index for initial inserts
await db.index.createFlat({
  collection: 'large_dataset'
});

// Insert in batches
for (let i = 0; i < totalVectors; i += BATCH_SIZE) {
  await db.vector.insertBatch({
    collection: 'large_dataset',
    vectors: getVectorBatch(i, BATCH_SIZE)
  });

  // Build HNSW after reaching threshold
  if (i === 1000000) {
    console.log('Switching to HNSW index...');
    await db.index.delete({ collection: 'large_dataset' });
    await db.index.createHNSW({
      collection: 'large_dataset',
      m: 16,
      efConstruction: 200
    });
  }

  // Optimize periodically
  if (i % 1000000 === 0 && i > 0) {
    await db.index.optimize({ collection: 'large_dataset' });
  }
}
```

## Best Practices

### 1. Index Selection
- **<10K vectors**: Flat index (brute force is fast enough)
- **10K-1M vectors**: HNSW with M=16, ef_construction=200
- **>1M vectors**: HNSW with M=24, ef_construction=400 + quantization

### 2. Build Strategy
- Insert vectors first, then build index (faster)
- Use parallel build for large datasets
- Optimize after bulk inserts

### 3. Memory Management
```typescript
// Estimate HNSW memory usage
const estimatedMemoryMB = (
  vectorCount * dimension * 4 +           // Vectors (float32)
  vectorCount * m * 2 * 8 +               // Graph structure
  vectorCount * metadataSize              // Metadata
) / (1024 * 1024);

console.log(`Estimated memory: ${estimatedMemoryMB}MB`);

// Use quantization if memory is limited
if (estimatedMemoryMB > availableMemoryMB) {
  await db.quantize.scalar({
    collection: 'mydata',
    bits: 8  // 4x memory reduction
  });
}
```

### 4. Search Tuning
- Start with ef_search = 2*k
- Increase if recall < 95%
- Decrease if latency > target
- Monitor and adjust based on metrics

### 5. Index Maintenance
```typescript
// Periodic maintenance schedule
setInterval(async () => {
  const stats = await db.index.stats({ collection: 'prod' });

  // Optimize if fragmented
  if (stats.fragmentation > 0.2) {
    await db.index.optimize({ collection: 'prod' });
  }

  // Rebuild if severely degraded
  if (stats.avgRecall < 0.90) {
    await db.index.rebuild({
      collection: 'prod',
      m: 24,
      efConstruction: 400
    });
  }
}, 24 * 60 * 60 * 1000);  // Daily
```

### 6. A/B Testing Index Parameters
```typescript
// Test different configurations
const configs = [
  { m: 12, ef: 100, efSearch: 50 },
  { m: 16, ef: 200, efSearch: 100 },
  { m: 24, ef: 400, efSearch: 200 }
];

for (const config of configs) {
  const collection = `test_m${config.m}_ef${config.ef}`;

  await db.index.createHNSW({
    collection,
    m: config.m,
    efConstruction: config.ef
  });

  // Run benchmark
  const metrics = await db.bench.run({
    collection,
    queries: testQueries,
    k: 10,
    efSearch: config.efSearch
  });

  console.log(`Config ${JSON.stringify(config)}:
    Recall: ${metrics.recall}
    Latency: ${metrics.avgLatencyMs}ms
    QPS: ${metrics.qps}
  `);
}
```

## Performance Benchmarks

### HNSW vs Flat Index

| Vectors | Flat (ms) | HNSW (ms) | Speedup | Recall |
|---------|-----------|-----------|---------|--------|
| 10K     | 5         | 2         | 2.5x    | 99%    |
| 100K    | 50        | 3         | 16x     | 98%    |
| 1M      | 500       | 5         | 100x    | 97%    |
| 10M     | 5000      | 10        | 500x    | 96%    |

### Memory Usage (1M vectors, 1536 dim)

| Configuration | Memory | Recall | Latency |
|---------------|--------|--------|---------|
| Flat          | 6GB    | 100%   | 500ms   |
| HNSW M=12     | 8GB    | 95%    | 8ms     |
| HNSW M=16     | 10GB   | 97%    | 5ms     |
| HNSW M=24     | 14GB   | 99%    | 7ms     |
| HNSW M=16 + Q8| 3GB    | 96%    | 6ms     |

## Troubleshooting

### Low Recall
1. Increase ef_construction (rebuild required)
2. Increase ef_search (no rebuild needed)
3. Increase M parameter (rebuild required)
4. Check vector normalization for cosine metric

### High Latency
1. Decrease ef_search
2. Decrease M parameter (rebuild required)
3. Use quantization
4. Add more CPU cores (parallel search)

### High Memory Usage
1. Use quantization (4-32x reduction)
2. Decrease M parameter (rebuild required)
3. Use memory-mapped storage
4. Consider sharding across nodes

### Slow Index Build
1. Use parallel build
2. Decrease ef_construction
3. Increase batch size for inserts
4. Use SSD storage for faster I/O

## Related Skills
- `vector-operations` - Core vector operations
- `quantization` - Memory optimization
- `benchmarking` - Performance testing
- `cluster-management` - Distributed indexing
