---
name: collection-management
description: Multi-collection handling with aliases and namespace isolation
tags: [collection, namespace, alias, multi-tenant, organization]
category: core
priority: P0
---

# Collection Management Skill

## Overview

Master multi-collection strategies for organizing vector data, implementing multi-tenancy, and managing different embedding models. Collections provide namespace isolation and independent configuration.

## Available Operations

### 1. Create Collection

```bash
# CLI
ruvector-flow collection create --name mydata --dimension 1536 --metric cosine --description "Production embeddings"

# MCP Tool
{
  "tool": "collection_create",
  "name": "mydata",
  "dimension": 1536,
  "metric": "cosine",
  "description": "Production embeddings"
}
```

### 2. Delete Collection

```bash
# CLI
ruvector-flow collection delete --name mydata --confirm

# MCP Tool
{
  "tool": "collection_delete",
  "name": "mydata"
}
```

### 3. List Collections

```bash
# CLI
ruvector-flow collection list

# MCP Tool
{
  "tool": "collection_list"
}
```

### 4. Collection Statistics

```bash
# CLI
ruvector-flow collection stats --name mydata

# MCP Tool
{
  "tool": "collection_stats",
  "name": "mydata"
}
```

### 5. Collection Info

```bash
# CLI
ruvector-flow collection info --name mydata

# MCP Tool
{
  "tool": "collection_info",
  "name": "mydata"
}
```

### 6. Create Alias

```bash
# CLI
ruvector-flow collection alias create --name prod --target mydata_v2

# MCP Tool
{
  "tool": "alias_create",
  "name": "prod",
  "target": "mydata_v2"
}
```

### 7. Delete Alias

```bash
# CLI
ruvector-flow collection alias delete --name prod

# MCP Tool
{
  "tool": "alias_delete",
  "name": "prod"
}
```

### 8. List Aliases

```bash
# CLI
ruvector-flow collection alias list

# MCP Tool
{
  "tool": "alias_list"
}
```

### 9. Switch Alias

```bash
# CLI
ruvector-flow collection alias switch --name prod --target mydata_v3

# MCP Tool
{
  "tool": "alias_switch",
  "name": "prod",
  "target": "mydata_v3"
}
```

## Example Usage

### Multi-Model Strategy

```typescript
import { RuvectorFlow } from '@ruvector/flow';

const db = new RuvectorFlow();

// Different collections for different embedding models
await db.collection.create({
  name: 'openai_ada002',
  dimension: 1536,
  metric: 'cosine',
  description: 'OpenAI text-embedding-ada-002'
});

await db.collection.create({
  name: 'cohere_v3',
  dimension: 1024,
  metric: 'cosine',
  description: 'Cohere embed-english-v3.0'
});

await db.collection.create({
  name: 'custom_model',
  dimension: 768,
  metric: 'l2',
  description: 'Custom BERT model'
});

// Insert to appropriate collection
const embedding = await getOpenAIEmbedding(text);
await db.vector.insert({
  collection: 'openai_ada002',
  id: docId,
  vector: embedding,
  metadata: { text, model: 'ada-002' }
});
```

### Multi-Tenancy

```typescript
// One collection per tenant
async function createTenant(tenantId: string) {
  await db.collection.create({
    name: `tenant_${tenantId}`,
    dimension: 1536,
    metric: 'cosine',
    description: `Data for tenant ${tenantId}`
  });

  // Create alias for easy access
  await db.alias.create({
    name: `current_${tenantId}`,
    target: `tenant_${tenantId}`
  });
}

// Access tenant data
async function searchTenant(tenantId: string, query: number[]) {
  return db.vector.search({
    collection: `current_${tenantId}`,  // Use alias
    query,
    k: 10
  });
}
```

### Blue-Green Deployment

```typescript
// Zero-downtime index updates
async function blueGreenUpdate() {
  const PROD_ALIAS = 'prod_search';

  // 1. Create new collection (green)
  await db.collection.create({
    name: 'embeddings_v2',
    dimension: 1536,
    metric: 'cosine'
  });

  // 2. Build new index
  await db.index.createHNSW({
    collection: 'embeddings_v2',
    m: 24,  // Improved parameters
    efConstruction: 400
  });

  // 3. Migrate data
  const vectors = await db.vector.scroll({
    collection: 'embeddings_v1',  // Old (blue)
    batchSize: 10000
  });

  await db.vector.insertBatch({
    collection: 'embeddings_v2',  // New (green)
    vectors
  });

  // 4. Validate new collection
  const validation = await validateCollection('embeddings_v2');
  if (!validation.ok) {
    throw new Error('Validation failed');
  }

  // 5. Switch alias atomically (zero downtime)
  await db.alias.switch({
    name: PROD_ALIAS,
    target: 'embeddings_v2'
  });

  // 6. Keep old collection for rollback
  console.log('Deployment complete. Old collection: embeddings_v1');

  // 7. Delete old collection after validation period
  setTimeout(async () => {
    await db.collection.delete({ name: 'embeddings_v1' });
  }, 24 * 60 * 60 * 1000);  // 24 hours
}
```

### Environment-Based Collections

```typescript
// Different collections per environment
const config = {
  development: {
    collection: 'dev_embeddings',
    efSearch: 50
  },
  staging: {
    collection: 'staging_embeddings',
    efSearch: 100
  },
  production: {
    collection: 'prod_embeddings',
    efSearch: 200
  }
};

const env = process.env.NODE_ENV || 'development';
const { collection, efSearch } = config[env];

const results = await db.vector.search({
  collection,
  query: queryVector,
  k: 10,
  efSearch
});
```

### Versioned Collections

```typescript
// Track collection versions
async function createVersionedCollection(baseName: string, version: string) {
  const collectionName = `${baseName}_${version}`;

  await db.collection.create({
    name: collectionName,
    dimension: 1536,
    metric: 'cosine',
    description: `Version ${version}`
  });

  // Point latest alias to new version
  await db.alias.create({
    name: `${baseName}_latest`,
    target: collectionName
  });

  return collectionName;
}

// Usage
await createVersionedCollection('embeddings', 'v1.0.0');
await createVersionedCollection('embeddings', 'v1.1.0');

// Always use latest
const results = await db.vector.search({
  collection: 'embeddings_latest',
  query: queryVector
});
```

### Collection Migration

```typescript
// Migrate between collections with transformation
async function migrateCollection(
  source: string,
  target: string,
  transform?: (vector: Vector) => Vector
) {
  // Create target collection
  const sourceInfo = await db.collection.info({ name: source });
  await db.collection.create({
    name: target,
    dimension: sourceInfo.dimension,
    metric: sourceInfo.metric
  });

  // Migrate in batches
  let offset = 0;
  const batchSize = 10000;

  while (true) {
    const batch = await db.vector.scroll({
      collection: source,
      offset,
      batchSize
    });

    if (batch.length === 0) break;

    const transformed = transform
      ? batch.map(transform)
      : batch;

    await db.vector.insertBatch({
      collection: target,
      vectors: transformed
    });

    offset += batch.length;
    console.log(`Migrated ${offset} vectors`);
  }

  // Verify counts match
  const sourceCount = await db.vector.count({ collection: source });
  const targetCount = await db.vector.count({ collection: target });

  if (sourceCount !== targetCount) {
    throw new Error('Migration incomplete');
  }
}
```

## Best Practices

### 1. Naming Conventions
```typescript
// Use clear, descriptive names
const collections = {
  // Model-based
  'openai_ada002': 'OpenAI embeddings',
  'cohere_v3': 'Cohere embeddings',

  // Purpose-based
  'user_profiles': 'User embedding vectors',
  'product_catalog': 'Product descriptions',

  // Environment-based
  'prod_search': 'Production search index',
  'dev_test': 'Development testing',

  // Versioned
  'embeddings_v1_0_0': 'Version 1.0.0',
  'embeddings_v1_1_0': 'Version 1.1.0'
};
```

### 2. Collection Strategy Selection

| Use Case | Strategy | Example |
|----------|----------|---------|
| Multiple embedding models | Collection per model | `openai_ada`, `cohere_v3` |
| Multi-tenancy | Collection per tenant | `tenant_123`, `tenant_456` |
| Data categories | Collection per category | `users`, `products`, `docs` |
| Environments | Collection per env | `dev`, `staging`, `prod` |
| Versioning | Collection per version | `v1`, `v2`, `v3` |

### 3. Alias Usage
- **Always use aliases in production** - enables zero-downtime updates
- Use `{purpose}_{env}` naming: `search_prod`, `search_staging`
- Keep old collections for rollback
- Document alias targets

### 4. Collection Limits
```typescript
// Monitor collection sizes
const stats = await db.collection.stats({ name: 'mydata' });

if (stats.vectorCount > 10_000_000) {
  console.warn('Collection growing large, consider:');
  console.warn('- Sharding across multiple collections');
  console.warn('- Archiving old vectors');
  console.warn('- Using quantization');
}
```

### 5. Cleanup Strategy
```typescript
// Regular cleanup of unused collections
const allCollections = await db.collection.list();
const now = Date.now();
const retentionDays = 30;

for (const coll of allCollections) {
  const info = await db.collection.info({ name: coll.name });

  // Delete old temporary collections
  if (coll.name.startsWith('temp_')) {
    const age = now - info.createdAt;
    if (age > retentionDays * 24 * 60 * 60 * 1000) {
      await db.collection.delete({ name: coll.name });
    }
  }
}
```

### 6. Multi-Collection Search
```typescript
// Search across multiple collections
async function multiCollectionSearch(
  collections: string[],
  query: number[],
  k: number
) {
  const results = await Promise.all(
    collections.map(collection =>
      db.vector.search({ collection, query, k })
    )
  );

  // Merge and re-rank
  const merged = results
    .flat()
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);

  return merged;
}

// Usage
const results = await multiCollectionSearch(
  ['openai_docs', 'cohere_docs', 'custom_docs'],
  queryVector,
  10
);
```

## Monitoring

```typescript
// Collection health dashboard
async function getCollectionHealth() {
  const collections = await db.collection.list();

  for (const coll of collections) {
    const stats = await db.collection.stats({ name: coll.name });
    const info = await db.collection.info({ name: coll.name });

    console.log(`
Collection: ${coll.name}
  Vectors: ${stats.vectorCount}
  Memory: ${stats.memoryMB}MB
  Index Type: ${info.indexType}
  Created: ${new Date(info.createdAt).toISOString()}
  Last Updated: ${new Date(stats.lastUpdate).toISOString()}
    `);
  }
}
```

## Troubleshooting

### Collection Not Found
- Verify collection name (case-sensitive)
- Check if using alias - ensure alias exists
- List all collections to debug

### Dimension Mismatch
- Cannot insert vectors with different dimensions
- Create new collection for different embedding models
- Verify embedding model output dimension

### High Memory Usage
- Monitor collection stats regularly
- Use quantization for large collections
- Consider sharding across multiple collections
- Archive old/unused collections

## Related Skills
- `vector-operations` - Working with vectors in collections
- `index-management` - Index strategies per collection
- `cluster-management` - Distributed collections
- `storage` - Collection persistence
