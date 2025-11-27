# Filter Query Commands

Advanced filtering and querying operations for precise vector search.

## Commands

### /filter query

Execute advanced filter queries on vector payloads.

**Syntax:**
```bash
/filter query <collection> [filter-options]
```

**Arguments:**
- `<collection>` - Collection name

**Filter Options:**
- `--eq <field>=<value>` - Equality filter
- `--ne <field>=<value>` - Not equal filter
- `--gt <field>=<value>` - Greater than filter
- `--gte <field>=<value>` - Greater than or equal filter
- `--lt <field>=<value>` - Less than filter
- `--lte <field>=<value>` - Less than or equal filter
- `--range <field>=<min>:<max>` - Range filter
- `--in <field>=<val1,val2>` - In list filter
- `--not-in <field>=<val1,val2>` - Not in list filter
- `--geo-radius <field>=<lat,lon,radius>` - Geographic radius filter
- `--geo-bbox <field>=<lat1,lon1,lat2,lon2>` - Geographic bounding box filter
- `--match-text <field>=<text>` - Text match filter
- `--match-phrase <field>=<phrase>` - Phrase match filter
- `--and` - Combine filters with AND logic (default)
- `--or` - Combine filters with OR logic
- `--not` - Negate filter

**Example:**
```bash
# Equality filter
/filter query products --eq category=electronics

# Range filter
/filter query products --range price=10:100

# Multiple filters (AND)
/filter query products --eq category=electronics --range price=10:100

# OR logic
/filter query products --or --eq category=electronics --eq category=books

# Geographic filter
/filter query locations --geo-radius location=37.7749,-122.4194,10km

# Text search
/filter query documents --match-text content="machine learning"

# Complex query
/filter query products --and --eq category=electronics --range price=50:500 --in brand=Apple,Samsung
```

**Returns:**
```json
{
  "results": [
    {
      "id": "prod-1",
      "payload": {
        "name": "Product 1",
        "category": "electronics",
        "price": 99.99,
        "brand": "Apple"
      }
    }
  ],
  "count": 1,
  "filter": {
    "and": [
      {"eq": {"category": "electronics"}},
      {"range": {"price": {"gte": 50, "lte": 500}}},
      {"in": {"brand": ["Apple", "Samsung"]}}
    ]
  }
}
```

---

### /filter index create

Create an index on a payload field for faster filtering.

**Syntax:**
```bash
/filter index create <collection> --field <field> [options]
```

**Arguments:**
- `<collection>` - Collection name
- `--field, -f <field>` - Field name to index
- `--type <type>` - Index type: keyword, number, geo, text (default: auto-detect)
- `--name <name>` - Index name (default: field name)

**Example:**
```bash
/filter index create products --field category --type keyword
/filter index create products --field price --type number
/filter index create locations --field coords --type geo
/filter index create documents --field content --type text
```

**Returns:**
```json
{
  "collection": "products",
  "field": "category",
  "index_type": "keyword",
  "index_name": "category_idx",
  "status": "created"
}
```

---

### /filter index list

List all filter indexes for a collection.

**Syntax:**
```bash
/filter index list <collection>
```

**Arguments:**
- `<collection>` - Collection name

**Example:**
```bash
/filter index list products
```

**Returns:**
```json
{
  "collection": "products",
  "indexes": [
    {
      "field": "category",
      "type": "keyword",
      "name": "category_idx",
      "size_bytes": 1024000,
      "cardinality": 50
    },
    {
      "field": "price",
      "type": "number",
      "name": "price_idx",
      "size_bytes": 512000,
      "range": {"min": 0.99, "max": 9999.99}
    }
  ],
  "total": 2
}
```

---

### /filter test

Test a filter expression without executing a query.

**Syntax:**
```bash
/filter test <collection> <filter-expression>
```

**Arguments:**
- `<collection>` - Collection name
- `<filter-expression>` - Filter expression to test

**Example:**
```bash
/filter test products --eq category=electronics --range price=10:100
/filter test locations --geo-radius location=37.7749,-122.4194,5km
```

**Returns:**
```json
{
  "filter": {
    "and": [
      {"eq": {"category": "electronics"}},
      {"range": {"price": {"gte": 10, "lte": 100}}}
    ]
  },
  "valid": true,
  "estimated_results": 150,
  "indexed_fields": ["category", "price"],
  "performance": "optimal"
}
```

---

## Filter Types

### Comparison Filters

#### Equality (--eq)
```bash
/filter query products --eq category=electronics
```

#### Not Equal (--ne)
```bash
/filter query products --ne status=discontinued
```

#### Greater Than (--gt, --gte)
```bash
/filter query products --gt price=100
/filter query products --gte rating=4.5
```

#### Less Than (--lt, --lte)
```bash
/filter query products --lt stock=10
/filter query products --lte price=50
```

#### Range (--range)
```bash
/filter query products --range price=10:100
/filter query products --range rating=4.0:5.0
```

---

### List Filters

#### In (--in)
```bash
/filter query products --in category=electronics,computers,phones
/filter query products --in brand=Apple,Samsung,Google
```

#### Not In (--not-in)
```bash
/filter query products --not-in status=discontinued,out-of-stock
```

---

### Geographic Filters

#### Geographic Radius (--geo-radius)
```bash
# Find within 10km of San Francisco
/filter query locations --geo-radius coords=37.7749,-122.4194,10km

# Find within 5 miles
/filter query stores --geo-radius location=40.7128,-74.0060,5mi
```

#### Geographic Bounding Box (--geo-bbox)
```bash
# SF Bay Area bounding box
/filter query locations --geo-bbox coords=37.2,-122.5,38.0,-121.5
```

---

### Text Filters

#### Match Text (--match-text)
```bash
# Full-text search
/filter query documents --match-text content="machine learning algorithms"
```

#### Match Phrase (--match-phrase)
```bash
# Exact phrase match
/filter query articles --match-phrase title="artificial intelligence"
```

---

### Logical Operators

#### AND (default)
```bash
/filter query products --and --eq category=electronics --range price=100:500
```

#### OR
```bash
/filter query products --or --eq category=electronics --eq category=computers
```

#### NOT
```bash
/filter query products --not --eq status=discontinued
```

#### Complex Logic
```bash
# (category=electronics OR category=computers) AND price>100 AND NOT status=discontinued
/filter query products \
  --or --eq category=electronics --eq category=computers \
  --and --gt price=100 \
  --not --eq status=discontinued
```

---

## Filter with Vector Search

Combine filtering with vector similarity search:

```bash
# Search for similar products that are in stock and under $100
/vector search products \
  --query "[0.1,0.2,0.3]" \
  --k 10 \
  --filter "--and --eq status=in-stock --lt price=100"
```

---

## Performance Optimization

### Index Selection
- **Keyword fields**: category, status, brand
- **Number fields**: price, rating, stock
- **Geographic fields**: location, coordinates
- **Text fields**: description, content, title

### Best Practices
1. Create indexes on frequently filtered fields
2. Use specific filters (eq, range) over broad filters (not-in)
3. Combine filters efficiently (indexed fields first)
4. Test filters before production use
5. Monitor index size and cardinality

### Filter Performance
- **Indexed filters**: 100-1000x faster
- **Range queries**: Optimal with sorted indexes
- **Text search**: Requires text index
- **Geographic**: Requires geo index

---

## Common Options

- `--limit <n>` - Limit results (default: 100)
- `--offset <n>` - Skip results (default: 0)
- `--format <format>` - Output format: json, table (default: json)
- `--verbose, -v` - Verbose output with query plan
- `--help, -h` - Show command help

## Notes

- Filters are executed before vector search for efficiency
- Multiple filters are combined with AND by default
- Geographic coordinates use (latitude, longitude) format
- Text search supports stemming and tokenization
- Filter indexes significantly improve query performance
- Unindexed filters fall back to sequential scan
