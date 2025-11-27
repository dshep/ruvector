# Index Management Commands

HNSW and flat index operations for optimizing vector search performance.

## Commands

### /index create hnsw

Create an HNSW (Hierarchical Navigable Small World) index for fast approximate nearest neighbor search.

**Syntax:**
```bash
/index create hnsw <collection> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--m <m>` - Number of bi-directional links (default: 16)
- `--ef-construction <ef>` - Size of dynamic candidate list (default: 200)
- `--metric <metric>` - Distance metric: cosine, euclidean, dot (default: cosine)
- `--name <name>` - Index name (default: collection-hnsw)

**Example:**
```bash
/index create hnsw products --m 32 --ef-construction 400
/index create hnsw embeddings --metric euclidean --name embeddings-index
```

**Returns:**
```json
{
  "index": "products-hnsw",
  "type": "hnsw",
  "parameters": {
    "m": 32,
    "ef_construction": 400,
    "metric": "cosine"
  },
  "status": "created"
}
```

---

### /index create flat

Create a flat (brute-force) index for exact nearest neighbor search.

**Syntax:**
```bash
/index create flat <collection> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--metric <metric>` - Distance metric: cosine, euclidean, dot (default: cosine)
- `--name <name>` - Index name (default: collection-flat)

**Example:**
```bash
/index create flat small-dataset
/index create flat exact-search --metric dot --name precise-index
```

**Returns:**
```json
{
  "index": "small-dataset-flat",
  "type": "flat",
  "parameters": {"metric": "cosine"},
  "status": "created"
}
```

---

### /index build

Build or rebuild an index with current collection data.

**Syntax:**
```bash
/index build <collection> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--index <name>` - Index name (default: all indexes)
- `--incremental` - Incremental build (only new vectors)
- `--threads <n>` - Number of threads (default: auto)

**Example:**
```bash
/index build products
/index build embeddings --index embeddings-hnsw --incremental
/index build large-collection --threads 8
```

**Returns:**
```json
{
  "index": "products-hnsw",
  "vectors_indexed": 100000,
  "duration_ms": 5432,
  "status": "built"
}
```

---

### /index stats

Get statistics about an index.

**Syntax:**
```bash
/index stats <collection> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--index <name>` - Index name (default: all indexes)
- `--detailed` - Include detailed statistics

**Example:**
```bash
/index stats products
/index stats embeddings --index embeddings-hnsw --detailed
```

**Returns:**
```json
{
  "index": "products-hnsw",
  "type": "hnsw",
  "vectors": 100000,
  "size_bytes": 52428800,
  "parameters": {
    "m": 16,
    "ef_construction": 200,
    "max_level": 5
  },
  "performance": {
    "avg_search_time_ms": 1.2,
    "recall_at_10": 0.98
  }
}
```

---

### /index optimize

Optimize an index for better performance.

**Syntax:**
```bash
/index optimize <collection> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--index <name>` - Index name (default: all indexes)
- `--compact` - Compact index structure
- `--prune` - Prune unnecessary connections (HNSW)

**Example:**
```bash
/index optimize products --compact
/index optimize embeddings --index embeddings-hnsw --prune
```

**Returns:**
```json
{
  "index": "products-hnsw",
  "before_size_bytes": 52428800,
  "after_size_bytes": 45088768,
  "reduction_percent": 14.0,
  "duration_ms": 3210,
  "status": "optimized"
}
```

---

### /index rebuild

Completely rebuild an index from scratch.

**Syntax:**
```bash
/index rebuild <collection> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--index <name>` - Index name (default: all indexes)
- `--keep-old` - Keep old index until rebuild completes
- `--threads <n>` - Number of threads (default: auto)

**Example:**
```bash
/index rebuild products
/index rebuild embeddings --index embeddings-hnsw --keep-old
```

**Returns:**
```json
{
  "index": "products-hnsw",
  "vectors_indexed": 100000,
  "duration_ms": 8765,
  "status": "rebuilt"
}
```

---

### /index delete

Delete an index.

**Syntax:**
```bash
/index delete <collection> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--index <name>` - Index name (required)
- `--confirm` - Skip confirmation prompt

**Example:**
```bash
/index delete products --index old-index
/index delete embeddings --index test-hnsw --confirm
```

**Returns:**
```json
{
  "index": "old-index",
  "status": "deleted"
}
```

---

## Index Types

### HNSW (Hierarchical Navigable Small World)
- **Use case**: Fast approximate nearest neighbor search
- **Performance**: 150x faster than brute force with 95%+ recall
- **Parameters**:
  - `m`: Number of connections per layer (higher = better recall, more memory)
  - `ef_construction`: Build-time search depth (higher = better quality, slower build)
  - `ef_search`: Query-time search depth (configurable per search)

### Flat Index
- **Use case**: Exact nearest neighbor search on small datasets
- **Performance**: 100% recall, linear search time
- **Parameters**:
  - `metric`: Distance metric only

## Performance Tuning

### HNSW Parameters
- **Small datasets** (<10K vectors): m=8, ef_construction=100
- **Medium datasets** (10K-1M vectors): m=16, ef_construction=200
- **Large datasets** (>1M vectors): m=32, ef_construction=400

### Optimization Tips
- Run `index optimize` after large batch inserts
- Use `--incremental` builds for real-time updates
- Monitor `index stats` for performance metrics
- Rebuild indexes periodically for best performance

## Common Options

- `--format <format>` - Output format: json, table, yaml (default: json)
- `--verbose, -v` - Verbose output with progress information
- `--help, -h` - Show command help

## Notes

- Indexes are created asynchronously by default
- Multiple indexes can exist per collection
- HNSW provides 95%+ recall at 150x speed improvement
- Flat indexes guarantee 100% recall for exact search
- Index size typically 30-50% of raw vector data size
