---
name: filtering
description: Advanced filtering queries with metadata search and hybrid retrieval
tags: [filter, query, metadata, search, hybrid]
category: core
priority: P0
---

# Filtering Skill

## Overview

Master advanced filtering for hybrid search combining vector similarity with metadata queries. Filter by fields, ranges, geo-location, and text matching for precise retrieval.

## Available Filter Operators

### 1. Equality Filters

```bash
# Equal
ruvector-flow filter query --collection docs --field "status" --eq "published"

# Not Equal
ruvector-flow filter query --collection docs --field "status" --ne "draft"
```

### 2. Comparison Filters

```bash
# Greater Than
ruvector-flow filter query --collection docs --field "views" --gt 1000

# Greater Than or Equal
ruvector-flow filter query --collection docs --field "views" --gte 1000

# Less Than
ruvector-flow filter query --collection docs --field "created" --lt 1609459200

# Less Than or Equal
ruvector-flow filter query --collection docs --field "created" --lte 1609459200
```

### 3. Range Filters

```bash
# Range (inclusive)
ruvector-flow filter query --collection docs --field "price" --range "10:100"
```

### 4. Set Filters

```bash
# In (any of)
ruvector-flow filter query --collection docs --field "category" --in "tech,science,ai"

# Not In
ruvector-flow filter query --collection docs --field "category" --not-in "spam,nsfw"
```

### 5. Geo Filters

```bash
# Geo Radius
ruvector-flow filter query --collection places --geo-radius "lat:37.7749,lon:-122.4194,radius:10km"

# Geo Bounding Box
ruvector-flow filter query --collection places --geo-bbox "north:37.8,south:37.7,east:-122.3,west:-122.5"
```

### 6. Text Filters

```bash
# Match Text (full-text search)
ruvector-flow filter query --collection docs --match-text "field:content,query:artificial intelligence"

# Match Phrase (exact phrase)
ruvector-flow filter query --collection docs --match-phrase "field:title,phrase:vector database"
```

### 7. Logical Operators

```bash
# AND
ruvector-flow filter query --and "status:eq:published,views:gt:1000"

# OR
ruvector-flow filter query --or "category:eq:tech,category:eq:science"

# NOT
ruvector-flow filter query --not "status:eq:draft"
```

### 8. Filter Index Management

```bash
# Create index on field
ruvector-flow filter index create --collection docs --field "category"

# List indexed fields
ruvector-flow filter index list --collection docs

# Test filter performance
ruvector-flow filter test --collection docs --filter "status:eq:published"
```

## Example Usage

### Hybrid Search (Vector + Metadata)

```typescript
import { RuvectorFlow } from '@ruvector/flow';

const db = new RuvectorFlow();

// Search with filters
const results = await db.vector.search({
  collection: 'documents',
  query: queryVector,
  k: 10,
  filter: {
    and: [
      { field: 'status', operator: 'eq', value: 'published' },
      { field: 'views', operator: 'gte', value: 100 },
      { field: 'category', operator: 'in', value: ['tech', 'ai'] }
    ]
  }
});
```

### E-Commerce Product Search

```typescript
// Find similar products with filters
const results = await db.vector.search({
  collection: 'products',
  query: productEmbedding,
  k: 20,
  filter: {
    and: [
      // Price range
      {
        field: 'price',
        operator: 'range',
        value: { min: 50, max: 500 }
      },
      // In stock
      {
        field: 'in_stock',
        operator: 'eq',
        value: true
      },
      // Category
      {
        field: 'category',
        operator: 'in',
        value: ['electronics', 'computers']
      },
      // Rating
      {
        field: 'rating',
        operator: 'gte',
        value: 4.0
      },
      // Exclude specific brands
      {
        field: 'brand',
        operator: 'not_in',
        value: ['generic', 'unknown']
      }
    ]
  }
});
```

### Location-Based Search

```typescript
// Find nearby restaurants with semantic search
const results = await db.vector.search({
  collection: 'restaurants',
  query: await getEmbedding('italian pizza pasta'),
  k: 10,
  filter: {
    and: [
      // Within 5km radius
      {
        field: 'location',
        operator: 'geo_radius',
        value: {
          lat: 37.7749,
          lon: -122.4194,
          radius: 5,
          unit: 'km'
        }
      },
      // Rating >= 4
      {
        field: 'rating',
        operator: 'gte',
        value: 4.0
      },
      // Open now
      {
        field: 'open_hours',
        operator: 'match_text',
        value: getCurrentHourRange()
      }
    ]
  }
});
```

### Time-Based Filtering

```typescript
// Recent documents only
const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

const results = await db.vector.search({
  collection: 'articles',
  query: queryVector,
  k: 10,
  filter: {
    and: [
      // Created in last 30 days
      {
        field: 'created_at',
        operator: 'gte',
        value: thirtyDaysAgo
      },
      // Not in the future
      {
        field: 'created_at',
        operator: 'lte',
        value: Date.now()
      }
    ]
  }
});
```

### Complex Boolean Logic

```typescript
// (status = published AND views > 1000) OR (featured = true)
const results = await db.vector.search({
  collection: 'content',
  query: queryVector,
  k: 10,
  filter: {
    or: [
      {
        and: [
          { field: 'status', operator: 'eq', value: 'published' },
          { field: 'views', operator: 'gt', value: 1000 }
        ]
      },
      {
        field: 'featured',
        operator: 'eq',
        value: true
      }
    ]
  }
});
```

### Full-Text + Vector Search

```typescript
// Combine semantic and keyword search
const results = await db.vector.search({
  collection: 'knowledge_base',
  query: await getEmbedding(userQuery),
  k: 20,
  filter: {
    and: [
      // Must contain specific keywords
      {
        field: 'content',
        operator: 'match_text',
        value: 'machine learning'
      },
      // Must be in specific section
      {
        field: 'section',
        operator: 'match_phrase',
        value: 'technical documentation'
      },
      // Recent only
      {
        field: 'updated_at',
        operator: 'gte',
        value: Date.now() - (90 * 24 * 60 * 60 * 1000)
      }
    ]
  }
});
```

### User Personalization

```typescript
// Personalized search with user preferences
async function personalizedSearch(userId: string, query: string) {
  const user = await getUserPreferences(userId);

  const results = await db.vector.search({
    collection: 'recommendations',
    query: await getEmbedding(query),
    k: 10,
    filter: {
      and: [
        // User's preferred categories
        {
          field: 'category',
          operator: 'in',
          value: user.preferredCategories
        },
        // User's language
        {
          field: 'language',
          operator: 'eq',
          value: user.language
        },
        // Age-appropriate content
        {
          field: 'age_rating',
          operator: 'lte',
          value: user.ageRating
        },
        // Exclude blocked content
        {
          field: 'content_id',
          operator: 'not_in',
          value: user.blockedContent
        },
        // Match price range
        user.priceRange && {
          field: 'price',
          operator: 'range',
          value: user.priceRange
        }
      ].filter(Boolean)
    }
  });

  return results;
}
```

## Best Practices

### 1. Index Frequently Filtered Fields
```typescript
// Create indexes for fast filtering
await db.filter.createIndex({
  collection: 'products',
  field: 'category'  // High cardinality
});

await db.filter.createIndex({
  collection: 'products',
  field: 'in_stock'  // Boolean
});

await db.filter.createIndex({
  collection: 'products',
  field: 'price'  // Range queries
});
```

### 2. Filter Before Vector Search
- Filters reduce search space
- Apply most selective filters first
- Monitor filter selectivity

### 3. Optimize Filter Complexity
```typescript
// ❌ BAD: Too many OR conditions
{
  or: [
    { field: 'cat', operator: 'eq', value: 'a' },
    { field: 'cat', operator: 'eq', value: 'b' },
    { field: 'cat', operator: 'eq', value: 'c' },
    // ... 100 more
  ]
}

// ✅ GOOD: Use IN operator
{
  field: 'category',
  operator: 'in',
  value: ['a', 'b', 'c', /* ... */]
}
```

### 4. Cache Common Filters
```typescript
const filterCache = new Map();

async function searchWithCache(query: number[], filter: Filter) {
  const filterKey = JSON.stringify(filter);

  if (!filterCache.has(filterKey)) {
    const results = await db.vector.search({
      collection: 'docs',
      query,
      filter
    });
    filterCache.set(filterKey, results);
  }

  return filterCache.get(filterKey);
}
```

### 5. Metadata Design
```typescript
// Good metadata structure for filtering
interface DocumentMetadata {
  // Indexed fields
  status: 'draft' | 'published' | 'archived';
  category: string;
  author_id: string;
  created_at: number;  // Unix timestamp

  // Numeric fields for ranges
  views: number;
  rating: number;
  word_count: number;

  // Geo fields
  location?: {
    lat: number;
    lon: number;
  };

  // Text search fields
  tags: string[];

  // Non-indexed fields
  title: string;
  summary: string;
}
```

### 6. Filter Testing
```typescript
// Test filter performance
const testFilter = async (filter: Filter) => {
  const start = Date.now();

  const results = await db.filter.test({
    collection: 'products',
    filter
  });

  console.log(`
Filter: ${JSON.stringify(filter)}
Matched: ${results.count}
Time: ${Date.now() - start}ms
Selectivity: ${results.count / results.total * 100}%
  `);

  // Optimize if slow
  if (Date.now() - start > 100) {
    console.warn('Consider adding index or simplifying filter');
  }
};
```

### 7. Geo-Search Optimization
```typescript
// Use appropriate radius
const results = await db.vector.search({
  collection: 'locations',
  query: queryVector,
  k: 10,
  filter: {
    field: 'location',
    operator: 'geo_radius',
    value: {
      lat: userLat,
      lon: userLon,
      radius: 10,  // Start small
      unit: 'km'
    }
  }
});

// Expand if insufficient results
if (results.length < k) {
  // Retry with larger radius
}
```

## Performance Tips

### Filter Selectivity
| Selectivity | Performance | Strategy |
|-------------|-------------|----------|
| <1%         | Excellent   | Filter first, then vector search |
| 1-10%       | Good        | Combined filter + vector search |
| 10-50%      | Moderate    | Vector search with filter |
| >50%        | Poor        | Consider redesigning filter |

### Index Impact
```typescript
// Benchmark with/without index
const withoutIndex = await benchmarkFilter(filter);
// Add index
await db.filter.createIndex({ collection: 'docs', field: 'category' });
const withIndex = await benchmarkFilter(filter);

console.log(`Speedup: ${withoutIndex.ms / withIndex.ms}x`);
```

## Troubleshooting

### Slow Filter Queries
1. Add index on filtered fields
2. Reduce filter complexity
3. Increase filter selectivity
4. Use range instead of multiple OR conditions

### No Results with Filters
1. Verify filter values exist in data
2. Check field names (case-sensitive)
3. Test filter without vector search
4. Relax filter constraints

### High Memory Usage
1. Limit result set size with k
2. Use pagination for large results
3. Avoid storing large metadata
4. Index only necessary fields

## Related Skills
- `vector-operations` - Vector search operations
- `index-management` - Index optimization
- `collection-management` - Organizing filtered data
- `storage` - Metadata persistence
