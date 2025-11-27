# Vector Operations Commands

Vector CRUD operations for managing vector data in RuVector.

## Commands

### /vector insert

Insert a single vector into a collection.

**Syntax:**
```bash
/vector insert <collection> --vector <vector> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--vector, -v <vector>` - Vector data (comma-separated floats or JSON array)
- `--id <id>` - Optional vector ID (auto-generated if not provided)
- `--payload <json>` - Optional metadata payload as JSON

**Example:**
```bash
/vector insert products --vector "[0.1,0.2,0.3,0.4]" --id prod-1 --payload '{"name":"Product 1"}'
/vector insert embeddings -v "0.5,0.6,0.7" --payload '{"category":"electronics"}'
```

**Returns:**
```json
{
  "id": "prod-1",
  "status": "inserted",
  "collection": "products"
}
```

---

### /vector insert-batch

Insert multiple vectors in a single operation for better performance.

**Syntax:**
```bash
/vector insert-batch <collection> --file <file> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--file, -f <file>` - JSON file with array of vectors
- `--format <format>` - Input format: json, csv, ndjson (default: json)
- `--batch-size <size>` - Batch size for processing (default: 1000)

**Example:**
```bash
/vector insert-batch products --file vectors.json
/vector insert-batch embeddings -f data.csv --format csv --batch-size 500
```

**Input File Format (JSON):**
```json
[
  {
    "id": "vec-1",
    "vector": [0.1, 0.2, 0.3],
    "payload": {"name": "Item 1"}
  },
  {
    "vector": [0.4, 0.5, 0.6],
    "payload": {"name": "Item 2"}
  }
]
```

**Returns:**
```json
{
  "inserted": 1000,
  "failed": 0,
  "duration_ms": 245
}
```

---

### /vector search

Perform k-NN (k-nearest neighbors) vector similarity search.

**Syntax:**
```bash
/vector search <collection> --query <vector> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--query, -q <vector>` - Query vector
- `--k <k>` - Number of results (default: 10)
- `--filter <filter>` - Optional filter expression
- `--threshold <score>` - Minimum similarity score (0-1)
- `--metric <metric>` - Distance metric: cosine, euclidean, dot (default: cosine)

**Example:**
```bash
/vector search products --query "[0.1,0.2,0.3]" --k 5
/vector search embeddings -q "0.4,0.5,0.6" --k 10 --filter "category = 'electronics'" --threshold 0.8
```

**Returns:**
```json
{
  "results": [
    {
      "id": "prod-1",
      "score": 0.95,
      "payload": {"name": "Product 1", "category": "electronics"}
    },
    {
      "id": "prod-2",
      "score": 0.87,
      "payload": {"name": "Product 2", "category": "electronics"}
    }
  ],
  "count": 2,
  "duration_ms": 12
}
```

---

### /vector delete

Delete one or more vectors from a collection.

**Syntax:**
```bash
/vector delete <collection> --id <id> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--id <id>` - Vector ID (comma-separated for multiple)
- `--filter <filter>` - Delete by filter expression
- `--all` - Delete all vectors (requires confirmation)

**Example:**
```bash
/vector delete products --id prod-1
/vector delete embeddings --id "vec-1,vec-2,vec-3"
/vector delete old-data --filter "timestamp < '2024-01-01'"
```

**Returns:**
```json
{
  "deleted": 3,
  "status": "success"
}
```

---

### /vector update

Update vector data or payload.

**Syntax:**
```bash
/vector update <collection> --id <id> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--id <id>` - Vector ID
- `--vector <vector>` - New vector data
- `--payload <json>` - New or updated payload
- `--merge` - Merge payload with existing (default: replace)

**Example:**
```bash
/vector update products --id prod-1 --vector "[0.2,0.3,0.4]"
/vector update embeddings --id vec-1 --payload '{"status":"updated"}' --merge
```

**Returns:**
```json
{
  "id": "prod-1",
  "status": "updated",
  "version": 2
}
```

---

### /vector get

Retrieve a vector by ID.

**Syntax:**
```bash
/vector get <collection> --id <id>
```

**Arguments:**
- `<collection>` - Collection name
- `--id <id>` - Vector ID
- `--include-vector` - Include vector data in response (default: true)

**Example:**
```bash
/vector get products --id prod-1
/vector get embeddings --id vec-1 --include-vector
```

**Returns:**
```json
{
  "id": "prod-1",
  "vector": [0.1, 0.2, 0.3, 0.4],
  "payload": {"name": "Product 1"},
  "version": 1
}
```

---

### /vector scroll

Iterate through all vectors in a collection.

**Syntax:**
```bash
/vector scroll <collection> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--offset <offset>` - Starting offset (default: 0)
- `--limit <limit>` - Number of vectors to retrieve (default: 100)
- `--filter <filter>` - Optional filter expression
- `--order <field>` - Sort by field: id, timestamp (default: id)

**Example:**
```bash
/vector scroll products --limit 50
/vector scroll embeddings --offset 100 --limit 25 --filter "category = 'books'"
```

**Returns:**
```json
{
  "vectors": [
    {"id": "prod-1", "payload": {"name": "Product 1"}},
    {"id": "prod-2", "payload": {"name": "Product 2"}}
  ],
  "count": 2,
  "offset": 0,
  "total": 1000
}
```

---

### /vector count

Count vectors in a collection.

**Syntax:**
```bash
/vector count <collection> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--filter <filter>` - Optional filter expression

**Example:**
```bash
/vector count products
/vector count embeddings --filter "timestamp > '2024-01-01'"
```

**Returns:**
```json
{
  "count": 10000,
  "collection": "products"
}
```

---

## Common Options

- `--format <format>` - Output format: json, table, csv (default: json)
- `--verbose, -v` - Verbose output with timing information
- `--help, -h` - Show command help

## Notes

- All vector operations support batch processing for improved performance
- Vectors must match the collection's configured dimensions
- IDs are auto-generated if not provided
- Payloads can contain arbitrary JSON data for metadata
- Distance metrics: cosine (default), euclidean, dot product
