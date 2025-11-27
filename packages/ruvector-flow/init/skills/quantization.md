---
name: quantization
description: Vector quantization for 4-32x memory reduction
tags: [quantization, compression, memory, optimization, performance]
category: optimization
priority: P1
---

# Quantization Skill

## Overview

Master vector quantization techniques for dramatic memory reduction (4-32x) while maintaining high search accuracy. Enable large-scale vector databases with limited memory resources.

## Available Operations

### 1. Scalar Quantization

```bash
# CLI
ruvector-flow quantize scalar --collection mydata --bits 8

# MCP Tool
{
  "tool": "quantize_scalar",
  "collection": "mydata",
  "bits": 8
}
```

### 2. Product Quantization

```bash
# CLI
ruvector-flow quantize product --collection mydata --subvectors 8 --bits 8

# MCP Tool
{
  "tool": "quantize_product",
  "collection": "mydata",
  "subvectors": 8,
  "bits": 8
}
```

### 3. Binary Quantization

```bash
# CLI
ruvector-flow quantize binary --collection mydata

# MCP Tool
{
  "tool": "quantize_binary",
  "collection": "mydata"
}
```

### 4. Quantization Stats

```bash
# CLI
ruvector-flow quantize stats --collection mydata

# MCP Tool
{
  "tool": "quantize_stats",
  "collection": "mydata"
}
```

### 5. Decode Vectors

```bash
# CLI
ruvector-flow quantize decode --collection mydata --id vec1

# MCP Tool
{
  "tool": "quantize_decode",
  "collection": "mydata",
  "id": "vec1"
}
```

## Quantization Methods

### Scalar Quantization (4-8x compression)
- **8-bit**: 4x compression, ~99% accuracy
- **4-bit**: 8x compression, ~95% accuracy
- Best for: Most use cases, good accuracy/compression trade-off

### Product Quantization (8-32x compression)
- **8 subvectors**: 16x compression, ~97% accuracy
- **16 subvectors**: 32x compression, ~93% accuracy
- Best for: Large-scale deployments, acceptable accuracy loss

### Binary Quantization (32x compression)
- **1-bit**: 32x compression, ~85-90% accuracy
- Best for: Maximum compression, similarity ranking

## Example Usage

### Scalar Quantization (Recommended)

```typescript
import { RuvectorFlow } from '@ruvector/flow';

const db = new RuvectorFlow();

// Create collection with quantization
await db.collection.create({
  name: 'embeddings',
  dimension: 1536,
  metric: 'cosine',
  quantization: {
    type: 'scalar',
    bits: 8  // 4x memory reduction
  }
});

// Insert vectors - automatically quantized
await db.vector.insert({
  collection: 'embeddings',
  id: 'doc1',
  vector: fullPrecisionVector,  // Float32
  // Stored as uint8 internally
});

// Search uses quantized vectors
const results = await db.vector.search({
  collection: 'embeddings',
  query: queryVector,
  k: 10
  // Automatically uses quantized search
});

// Stats
const stats = await db.quantize.stats({
  collection: 'embeddings'
});
console.log(`
Original size: ${stats.originalMemoryMB}MB
Quantized size: ${stats.quantizedMemoryMB}MB
Compression: ${stats.compressionRatio}x
Accuracy: ${stats.avgRecall}%
`);
```

### Product Quantization (Maximum Compression)

```typescript
// For very large collections (>10M vectors)
await db.collection.create({
  name: 'large_embeddings',
  dimension: 1536,
  metric: 'cosine',
  quantization: {
    type: 'product',
    subvectors: 8,    // Divide into 8 subvectors
    bits: 8           // 8-bit per subvector
    // 1536 / 8 = 192 dims per subvector
    // Compression: (1536 * 4) / (8 * 1) = 768x smaller codebooks
  }
});

// Train codebooks on sample data
const trainingSet = await getSampleVectors(10000);
await db.quantize.train({
  collection: 'large_embeddings',
  trainingData: trainingSet
});

// Insert vectors
await db.vector.insertBatch({
  collection: 'large_embeddings',
  vectors: largeDataset
});

// Search with product quantization
const results = await db.vector.search({
  collection: 'large_embeddings',
  query: queryVector,
  k: 10,
  // Uses asymmetric distance computation (ADC)
});
```

### Binary Quantization (Ultra Compression)

```typescript
// Maximum compression for similarity ranking
await db.collection.create({
  name: 'binary_embeddings',
  dimension: 1536,
  metric: 'hamming',  // Hamming distance for binary
  quantization: {
    type: 'binary'
  }
});

// Insert vectors - converted to binary
await db.vector.insert({
  collection: 'binary_embeddings',
  id: 'doc1',
  vector: floatVector  // [0.1, -0.3, 0.5, ...] -> [1, 0, 1, ...]
});

// Ultra-fast search with binary vectors
const results = await db.vector.search({
  collection: 'binary_embeddings',
  query: queryVector,
  k: 100,  // Can retrieve more candidates (fast)
  // Uses popcount for hamming distance
});

// Re-rank with full precision if needed
const reranked = await rerankWithFullPrecision(
  results.slice(0, 10),
  queryVector
);
```

### Hybrid Approach (Speed + Accuracy)

```typescript
// Use quantization for initial search, full precision for re-ranking
class HybridSearch {
  private db: RuvectorFlow;

  async search(query: number[], k: number) {
    // 1. Fast search with quantization (retrieve k*10 candidates)
    const candidates = await this.db.vector.search({
      collection: 'quantized',
      query,
      k: k * 10,
      quantized: true
    });

    // 2. Re-rank top candidates with full precision
    const fullPrecisionCandidates = await Promise.all(
      candidates.map(c => this.db.quantize.decode({
        collection: 'quantized',
        id: c.id
      }))
    );

    // 3. Compute exact distances
    const reranked = fullPrecisionCandidates
      .map(vec => ({
        ...vec,
        distance: cosineSimilarity(query, vec.vector)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);

    return reranked;
  }
}
```

### Memory Budget Planning

```typescript
// Calculate memory requirements
function estimateMemory(
  vectorCount: number,
  dimension: number,
  quantization: string
) {
  const fullPrecisionMB = (vectorCount * dimension * 4) / (1024 * 1024);

  const compressed = {
    'scalar-8bit': fullPrecisionMB / 4,
    'scalar-4bit': fullPrecisionMB / 8,
    'product-8x8': fullPrecisionMB / 16,
    'binary': fullPrecisionMB / 32
  };

  return {
    fullPrecision: fullPrecisionMB,
    ...compressed
  };
}

// Example: 10M vectors, 1536 dimensions
const memory = estimateMemory(10_000_000, 1536, 'scalar-8bit');
console.log(`
Full precision: ${memory.fullPrecision.toFixed(2)}GB
Scalar 8-bit: ${memory['scalar-8bit'].toFixed(2)}GB
Binary: ${memory.binary.toFixed(2)}GB
`);
```

### Dynamic Quantization

```typescript
// Quantize based on available memory
async function adaptiveQuantization(collection: string) {
  const stats = await db.collection.stats({ name: collection });
  const availableMemoryGB = getAvailableMemory();

  const requiredMemoryGB = (stats.vectorCount * stats.dimension * 4) / (1024**3);

  if (requiredMemoryGB < availableMemoryGB) {
    // Enough memory, use full precision
    console.log('Using full precision');
    return;
  }

  const compressionNeeded = requiredMemoryGB / availableMemoryGB;

  if (compressionNeeded <= 4) {
    await db.quantize.scalar({ collection, bits: 8 });
    console.log('Applied 8-bit scalar quantization');
  } else if (compressionNeeded <= 16) {
    await db.quantize.product({ collection, subvectors: 8, bits: 8 });
    console.log('Applied product quantization');
  } else {
    await db.quantize.binary({ collection });
    console.log('Applied binary quantization');
  }
}
```

## Best Practices

### 1. Method Selection

| Vectors | Dimension | Memory | Recommended |
|---------|-----------|--------|-------------|
| <100K | Any | Plenty | No quantization |
| 100K-1M | 1536 | Limited | Scalar 8-bit |
| 1M-10M | 1536 | Limited | Scalar 8-bit or Product |
| >10M | 1536 | Limited | Product or Binary |

### 2. Accuracy vs Compression

```typescript
// Benchmark different quantization methods
async function benchmarkQuantization(collection: string) {
  const testQueries = await getTestQueries(1000);

  const results = {
    fullPrecision: await benchmark(collection, testQueries, 'none'),
    scalar8bit: await benchmark(collection, testQueries, 'scalar-8'),
    scalar4bit: await benchmark(collection, testQueries, 'scalar-4'),
    product: await benchmark(collection, testQueries, 'product'),
    binary: await benchmark(collection, testQueries, 'binary')
  };

  console.table(Object.entries(results).map(([method, stats]) => ({
    Method: method,
    'Memory (GB)': stats.memoryGB,
    'Recall@10': stats.recall,
    'Latency (ms)': stats.avgLatencyMs,
    'Compression': `${stats.compressionRatio}x`
  })));

  return results;
}
```

### 3. Training Data Selection
```typescript
// For product quantization, use representative sample
async function trainProductQuantization(collection: string) {
  // Sample 1-10% of data (at least 10K vectors)
  const sampleSize = Math.max(
    10000,
    Math.floor(vectorCount * 0.01)
  );

  const trainingSample = await db.vector.scroll({
    collection,
    batchSize: sampleSize,
    randomSample: true  // Random sample
  });

  await db.quantize.train({
    collection,
    method: 'product',
    trainingData: trainingSample,
    iterations: 100  // K-means iterations
  });
}
```

### 4. Rescoring Strategy
```typescript
// Oversample and rescore for better accuracy
const OVERSAMPLE_FACTOR = 10;

async function searchWithRescoring(
  query: number[],
  k: number
) {
  // 1. Get more candidates with quantized search
  const candidates = await db.vector.search({
    collection: 'quantized',
    query,
    k: k * OVERSAMPLE_FACTOR
  });

  // 2. Rescore with full precision
  const rescored = [];
  for (const candidate of candidates) {
    const fullVector = await db.quantize.decode({
      collection: 'quantized',
      id: candidate.id
    });

    rescored.push({
      ...candidate,
      exactDistance: computeDistance(query, fullVector.vector)
    });
  }

  // 3. Return top-k by exact distance
  return rescored
    .sort((a, b) => a.exactDistance - b.exactDistance)
    .slice(0, k);
}
```

### 5. Monitoring Quantization Quality
```typescript
// Track quantization accuracy over time
async function monitorQuantizationQuality() {
  const stats = await db.quantize.stats({ collection: 'embeddings' });

  console.log(`
Quantization Quality Report:
  Method: ${stats.method}
  Compression: ${stats.compressionRatio}x
  Memory Saved: ${stats.memorySavedGB}GB
  Avg Recall@10: ${stats.avgRecall}%
  Avg Recall@100: ${stats.avgRecall100}%
  Search Speedup: ${stats.searchSpeedup}x
  `);

  // Alert if quality degrades
  if (stats.avgRecall < 0.95) {
    console.warn('Quantization quality below target (95%)');
    console.warn('Consider: lower compression or retraining');
  }
}
```

## Performance Impact

### Memory Reduction
| Method | Compression | 1M vectors (1536d) |
|--------|-------------|-------------------|
| None | 1x | 6.1 GB |
| Scalar 8-bit | 4x | 1.5 GB |
| Scalar 4-bit | 8x | 768 MB |
| Product (8x8) | 16x | 384 MB |
| Binary | 32x | 192 MB |

### Search Speed
| Method | Speed | Accuracy |
|--------|-------|----------|
| None | 1x | 100% |
| Scalar 8-bit | 1.2x | 99% |
| Product (8x8) | 2-3x | 95-97% |
| Binary | 5-10x | 85-90% |

## Troubleshooting

### Low Recall
- Decrease compression (8-bit instead of 4-bit)
- Use product quantization instead of binary
- Retrain codebooks with more data
- Increase oversample factor for rescoring

### High Memory Usage
- Verify quantization is enabled
- Check for duplicate storage
- Monitor codebook size (product quantization)
- Clear quantization cache

### Slow Search
- Enable quantized distance computation
- Use binary quantization for initial filtering
- Reduce oversample factor
- Check if using index with quantization

### Training Failures
- Increase training sample size
- Check for NaN/Inf in data
- Normalize vectors before quantization
- Reduce number of subvectors

## Related Skills
- `vector-operations` - Vector CRUD with quantization
- `index-management` - HNSW with quantized vectors
- `storage` - Persisting quantized data
- `metrics` - Monitoring quantization performance
