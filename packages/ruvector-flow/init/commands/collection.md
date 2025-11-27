# Collection Management Commands

Multi-collection handling and aliasing operations for organizing vector data.

## Commands

### /collection create

Create a new vector collection.

**Syntax:**
```bash
/collection create <name> --dimensions <dim> [options]
```

**Arguments:**
- `<name>` - Collection name
- `--dimensions, -d <dim>` - Vector dimensions (required)
- `--metric <metric>` - Distance metric: cosine, euclidean, dot (default: cosine)
- `--schema <json>` - Payload schema as JSON
- `--on-disk` - Store vectors on disk (default: in-memory)
- `--quantization <type>` - Quantization: scalar, product, binary (optional)

**Example:**
```bash
/collection create products --dimensions 384 --metric cosine
/collection create embeddings -d 768 --on-disk --quantization scalar
/collection create images -d 2048 --schema '{"name":"string","category":"string"}'
```

**Returns:**
```json
{
  "name": "products",
  "dimensions": 384,
  "metric": "cosine",
  "storage": "memory",
  "status": "created",
  "vectors": 0
}
```

---

### /collection delete

Delete a collection and all its data.

**Syntax:**
```bash
/collection delete <name> [options]
```

**Arguments:**
- `<name>` - Collection name
- `--confirm` - Skip confirmation prompt
- `--keep-snapshots` - Keep existing snapshots

**Example:**
```bash
/collection delete old-products --confirm
/collection delete test-data --keep-snapshots
```

**Returns:**
```json
{
  "name": "old-products",
  "vectors_deleted": 50000,
  "status": "deleted"
}
```

---

### /collection list

List all collections.

**Syntax:**
```bash
/collection list [options]
```

**Arguments:**
- `--format <format>` - Output format: json, table, yaml (default: table)
- `--detailed` - Include detailed statistics

**Example:**
```bash
/collection list
/collection list --format json --detailed
```

**Returns:**
```json
{
  "collections": [
    {
      "name": "products",
      "dimensions": 384,
      "vectors": 100000,
      "indexes": ["products-hnsw"],
      "size_bytes": 153600000
    },
    {
      "name": "embeddings",
      "dimensions": 768,
      "vectors": 50000,
      "indexes": ["embeddings-hnsw"],
      "size_bytes": 153600000
    }
  ],
  "total": 2
}
```

---

### /collection stats

Get detailed statistics for a collection.

**Syntax:**
```bash
/collection stats <name>
```

**Arguments:**
- `<name>` - Collection name

**Example:**
```bash
/collection stats products
/collection stats embeddings
```

**Returns:**
```json
{
  "name": "products",
  "dimensions": 384,
  "metric": "cosine",
  "vectors": 100000,
  "size_bytes": 153600000,
  "indexes": [
    {
      "name": "products-hnsw",
      "type": "hnsw",
      "vectors": 100000,
      "size_bytes": 76800000
    }
  ],
  "storage": {
    "type": "memory",
    "quantization": "scalar",
    "compression_ratio": 4.0
  },
  "performance": {
    "avg_insert_time_ms": 0.5,
    "avg_search_time_ms": 1.2,
    "qps": 833
  }
}
```

---

### /collection info

Get basic information about a collection.

**Syntax:**
```bash
/collection info <name>
```

**Arguments:**
- `<name>` - Collection name

**Example:**
```bash
/collection info products
```

**Returns:**
```json
{
  "name": "products",
  "dimensions": 384,
  "metric": "cosine",
  "vectors": 100000,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T15:45:00Z"
}
```

---

### /collection alias create

Create an alias for a collection.

**Syntax:**
```bash
/collection alias create <alias> --collection <name>
```

**Arguments:**
- `<alias>` - Alias name
- `--collection, -c <name>` - Target collection name

**Example:**
```bash
/collection alias create prod-v2 --collection products-2024
/collection alias create current -c embeddings-latest
```

**Returns:**
```json
{
  "alias": "prod-v2",
  "collection": "products-2024",
  "status": "created"
}
```

---

### /collection alias delete

Delete an alias.

**Syntax:**
```bash
/collection alias delete <alias>
```

**Arguments:**
- `<alias>` - Alias name

**Example:**
```bash
/collection alias delete old-prod
```

**Returns:**
```json
{
  "alias": "old-prod",
  "status": "deleted"
}
```

---

### /collection alias list

List all collection aliases.

**Syntax:**
```bash
/collection alias list [options]
```

**Arguments:**
- `--format <format>` - Output format: json, table, yaml (default: table)

**Example:**
```bash
/collection alias list
/collection alias list --format json
```

**Returns:**
```json
{
  "aliases": [
    {"alias": "prod-v2", "collection": "products-2024"},
    {"alias": "current", "collection": "embeddings-latest"}
  ],
  "total": 2
}
```

---

### /collection alias switch

Switch an alias to point to a different collection (zero-downtime deployment).

**Syntax:**
```bash
/collection alias switch <alias> --collection <name>
```

**Arguments:**
- `<alias>` - Alias name
- `--collection, -c <name>` - New target collection

**Example:**
```bash
/collection alias switch production --collection products-v2
/collection alias switch current -c embeddings-2024
```

**Returns:**
```json
{
  "alias": "production",
  "old_collection": "products-v1",
  "new_collection": "products-v2",
  "status": "switched"
}
```

---

## Collection Schemas

Define payload structure for validation and optimization:

```json
{
  "name": {"type": "string", "indexed": true},
  "category": {"type": "string", "indexed": true},
  "price": {"type": "number", "indexed": true},
  "tags": {"type": "array", "items": "string"},
  "metadata": {"type": "object"}
}
```

## Storage Options

### Memory Storage
- **Pros**: Fastest performance
- **Cons**: Limited by RAM
- **Use case**: Real-time applications, small-to-medium datasets

### Disk Storage
- **Pros**: Large datasets, cost-effective
- **Cons**: Slower than memory
- **Use case**: Large datasets, batch processing

### Hybrid Storage
- **Pros**: Balance of speed and capacity
- **Cons**: More complex configuration
- **Use case**: Large datasets with hot/cold data

## Quantization Options

### Scalar Quantization
- **Compression**: 4x (32-bit → 8-bit)
- **Accuracy**: 95-98%
- **Speed**: Fast

### Product Quantization
- **Compression**: 8-32x
- **Accuracy**: 90-95%
- **Speed**: Medium

### Binary Quantization
- **Compression**: 32x
- **Accuracy**: 85-90%
- **Speed**: Very fast

## Zero-Downtime Deployment

Use aliases for seamless collection updates:

```bash
# 1. Create new collection version
/collection create products-v2 -d 384

# 2. Populate with data
/vector insert-batch products-v2 --file new-data.json

# 3. Build indexes
/index build products-v2

# 4. Switch alias
/collection alias switch production --collection products-v2

# 5. Delete old collection (optional)
/collection delete products-v1
```

## Common Options

- `--format <format>` - Output format: json, table, yaml (default: json)
- `--verbose, -v` - Verbose output
- `--help, -h` - Show command help

## Notes

- Collection names must be unique
- Dimensions cannot be changed after creation
- Aliases enable zero-downtime deployments
- Schema validation improves query performance
- Quantization reduces memory usage with minimal accuracy loss
