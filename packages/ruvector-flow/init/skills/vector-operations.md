---
name: vector-operations
description: Vector CRUD operations for semantic search and similarity matching
tags: [vector, crud, search, similarity, embeddings]
category: core
priority: P0
---

# Vector Operations Skill

## Overview

Master vector CRUD (Create, Read, Update, Delete) operations for semantic search, similarity matching, and AI embeddings management. This skill covers all fundamental vector database operations including insertion, retrieval, search, and deletion.

## Available Operations

### 1. Vector Insert

**Single Insert**
```bash
# CLI
ruvector-flow vector insert --collection mydata --id vec1 --vector "[0.1,0.2,0.3]" --metadata '{"key":"value"}'

# MCP Tool
{
  "tool": "vector_insert",
  "collection": "mydata",
  "id": "vec1",
  "vector": [0.1, 0.2, 0.3],
  "metadata": {"key": "value"}
}
```

**Batch Insert**
```bash
# CLI
ruvector-flow vector insert-batch --collection mydata --file vectors.jsonl --batch-size 1000

# MCP Tool
{
  "tool": "vector_insert_batch",
  "collection": "mydata",
  "vectors": [...],
  "batch_size": 1000
}
```

### 2. Vector Search (k-NN)

```bash
# CLI
ruvector-flow vector search --collection mydata --query "[0.1,0.2,0.3]" --k 10 --ef-search 200

# MCP Tool
{
  "tool": "vector_search",
  "collection": "mydata",
  "query": [0.1, 0.2, 0.3],
  "k": 10,
  "ef_search": 200,
  "filter": {...}
}
```

### 3. Vector Retrieve

```bash
# CLI
ruvector-flow vector get --collection mydata --id vec1

# MCP Tool
{
  "tool": "vector_get",
  "collection": "mydata",
  "id": "vec1"
}
```

### 4. Vector Update

```bash
# CLI
ruvector-flow vector update --collection mydata --id vec1 --vector "[0.4,0.5,0.6]" --metadata '{"updated":true}'

# MCP Tool
{
  "tool": "vector_update",
  "collection": "mydata",
  "id": "vec1",
  "vector": [0.4, 0.5, 0.6],
  "metadata": {"updated": true}
}
```

### 5. Vector Delete

```bash
# CLI
ruvector-flow vector delete --collection mydata --id vec1

# MCP Tool
{
  "tool": "vector_delete",
  "collection": "mydata",
  "id": "vec1"
}
```

### 6. Vector Scroll/Iterate

```bash
# CLI
ruvector-flow vector scroll --collection mydata --batch-size 100 --offset 0

# MCP Tool
{
  "tool": "vector_scroll",
  "collection": "mydata",
  "batch_size": 100,
  "offset": 0
}
```

### 7. Vector Count

```bash
# CLI
ruvector-flow vector count --collection mydata

# MCP Tool
{
  "tool": "vector_count",
  "collection": "mydata"
}
```

## Example Usage

### RAG System Implementation

```typescript
import { RuvectorFlow } from '@ruvector/flow';

const db = new RuvectorFlow();

// 1. Initialize collection
await db.collection.create({
  name: 'documents',
  dimension: 1536, // OpenAI embedding dimension
  metric: 'cosine'
});

// 2. Insert document embeddings
const embeddings = await getEmbeddings(documents);
await db.vector.insertBatch({
  collection: 'documents',
  vectors: embeddings.map((emb, i) => ({
    id: `doc_${i}`,
    vector: emb,
    metadata: {
      text: documents[i],
      source: 'knowledge_base'
    }
  })),
  batchSize: 1000
});

// 3. Semantic search
const results = await db.vector.search({
  collection: 'documents',
  query: await getEmbedding(userQuery),
  k: 5,
  filter: {
    field: 'source',
    operator: 'eq',
    value: 'knowledge_base'
  }
});

// 4. Get context for LLM
const context = results.map(r => r.metadata.text).join('\n\n');
```

### Batch Processing Pipeline

```typescript
// Process large dataset in batches
const BATCH_SIZE = 10000;
const totalVectors = 1000000;

for (let offset = 0; offset < totalVectors; offset += BATCH_SIZE) {
  const batch = await fetchVectorBatch(offset, BATCH_SIZE);

  await db.vector.insertBatch({
    collection: 'large_dataset',
    vectors: batch,
    batchSize: 1000 // Internal batch size
  });

  console.log(`Processed ${offset + batch.length}/${totalVectors}`);
}
```

### Update Stale Embeddings

```typescript
// Find and update old embeddings
const staleVectors = await db.vector.scroll({
  collection: 'embeddings',
  filter: {
    field: 'updated_at',
    operator: 'lt',
    value: Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days
  }
});

for (const vec of staleVectors) {
  const newEmbedding = await recompute(vec.metadata.text);
  await db.vector.update({
    collection: 'embeddings',
    id: vec.id,
    vector: newEmbedding,
    metadata: {
      ...vec.metadata,
      updated_at: Date.now()
    }
  });
}
```

## Best Practices

### 1. Batch Operations
- **Always use batch insert for >100 vectors** - 10-50x faster than individual inserts
- Use batch sizes of 1000-10000 for optimal throughput
- Monitor memory usage during large batch operations

### 2. Metadata Strategy
- Keep metadata small (<1KB per vector)
- Index frequently filtered fields
- Use structured metadata for complex queries

### 3. Search Optimization
- Start with ef_search = 2*k and adjust based on recall/latency needs
- Use filters to reduce search space
- Cache common queries

### 4. ID Management
- Use meaningful, sortable IDs (e.g., `user_123_doc_456`)
- Avoid special characters in IDs
- Consider UUID v7 for time-ordered IDs

### 5. Error Handling
```typescript
try {
  await db.vector.insert({...});
} catch (error) {
  if (error.code === 'DUPLICATE_ID') {
    // Handle duplicate
    await db.vector.update({...});
  } else if (error.code === 'DIMENSION_MISMATCH') {
    // Handle dimension error
    console.error('Vector dimension does not match collection');
  }
}
```

### 6. Performance Tips
- Use bulk operations whenever possible
- Pre-allocate collection capacity if size is known
- Monitor vector_count to track growth
- Use scroll for large result sets (>10000 vectors)

### 7. Memory Management
- Delete unused vectors regularly
- Use quantization for large collections (>1M vectors)
- Monitor memory usage with metrics

## Common Patterns

### Upsert Pattern
```typescript
async function upsert(collection: string, id: string, vector: number[], metadata: any) {
  try {
    await db.vector.insert({ collection, id, vector, metadata });
  } catch (error) {
    if (error.code === 'DUPLICATE_ID') {
      await db.vector.update({ collection, id, vector, metadata });
    } else {
      throw error;
    }
  }
}
```

### Incremental Updates
```typescript
// Update only metadata, keep vector unchanged
await db.vector.update({
  collection: 'docs',
  id: 'doc_1',
  metadata: { views: currentViews + 1 }
  // vector not provided = keep existing
});
```

### Soft Delete
```typescript
// Mark as deleted instead of removing
await db.vector.update({
  collection: 'users',
  id: 'user_123',
  metadata: { deleted: true, deleted_at: Date.now() }
});

// Filter out deleted in searches
const results = await db.vector.search({
  collection: 'users',
  query: queryVector,
  filter: { field: 'deleted', operator: 'ne', value: true }
});
```

## Troubleshooting

### High Latency
- Reduce ef_search value
- Add HNSW index if using flat index
- Use filters to reduce search space
- Check for memory pressure

### Memory Issues
- Enable quantization (4-32x reduction)
- Use batch operations with smaller batches
- Implement pagination with scroll
- Clean up deleted vectors

### Low Recall
- Increase ef_search value
- Rebuild HNSW index with higher M parameter
- Check vector normalization
- Verify distance metric (cosine vs L2)

## Related Skills
- `index-management` - Optimize search with HNSW indexes
- `filtering` - Advanced query filtering
- `quantization` - Memory optimization
- `collection-management` - Multi-collection strategies
