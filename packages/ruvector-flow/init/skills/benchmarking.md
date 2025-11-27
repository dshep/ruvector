---
name: benchmarking
description: Performance testing and system comparison
tags: [benchmark, performance, testing, latency, throughput]
category: operations
priority: P2
---

# Benchmarking Skill

## Overview

Master performance testing and benchmarking for vector databases. Compare systems, measure latency, analyze throughput, and optimize configurations with comprehensive benchmark suites.

## Available Operations

### 1. Run Benchmark

```bash
# CLI
ruvector-flow bench run --collection mydata --queries 1000 --k 10

# MCP Tool
{
  "tool": "bench_run",
  "collection": "mydata",
  "queries": 1000,
  "k": 10
}
```

### 2. Generate Dataset

```bash
# CLI
ruvector-flow bench generate --vectors 100000 --dimension 1536 --output dataset.json

# MCP Tool
{
  "tool": "bench_generate",
  "vectors": 100000,
  "dimension": 1536,
  "output": "dataset.json"
}
```

### 3. Compare Systems

```bash
# CLI
ruvector-flow bench compare --systems "ruvector,pinecone,weaviate" --dataset dataset.json

# MCP Tool
{
  "tool": "bench_compare",
  "systems": ["ruvector", "pinecone", "weaviate"],
  "dataset": "dataset.json"
}
```

### 4. Generate Report

```bash
# CLI
ruvector-flow bench report --input results.json --output report.html

# MCP Tool
{
  "tool": "bench_report",
  "input": "results.json",
  "output": "report.html"
}
```

### 5. Latency Stats

```bash
# CLI
ruvector-flow bench latency --collection mydata --queries 10000

# MCP Tool
{
  "tool": "bench_latency",
  "collection": "mydata",
  "queries": 10000
}
```

### 6. Memory Profile

```bash
# CLI
ruvector-flow bench memory --collection mydata --duration 60

# MCP Tool
{
  "tool": "bench_memory",
  "collection": "mydata",
  "duration_seconds": 60
}
```

## Example Usage

### Basic Benchmark

```typescript
import { RuvectorFlow } from '@ruvector/flow';

const db = new RuvectorFlow();

// Run comprehensive benchmark
const results = await db.bench.run({
  collection: 'embeddings',
  queries: 1000,
  k: 10,
  concurrency: 10,
  warmup: 100
});

console.log(`
=== Benchmark Results ===
Total Queries: ${results.totalQueries}
Duration: ${results.durationMs}ms
QPS: ${results.qps}

Latency:
  Min: ${results.latency.min}ms
  Max: ${results.latency.max}ms
  Mean: ${results.latency.mean}ms
  P50: ${results.latency.p50}ms
  P95: ${results.latency.p95}ms
  P99: ${results.latency.p99}ms

Recall: ${results.recall}%
Throughput: ${results.throughputMBps}MB/s
`);
```

### Generate Test Dataset

```typescript
// Generate realistic test data
async function generateBenchmarkDataset() {
  const dataset = await db.bench.generateDataset({
    vectorCount: 100000,
    dimension: 1536,
    distribution: 'normal',  // or 'uniform', 'clustered'
    queryCount: 1000,
    metadata: {
      categories: ['tech', 'science', 'health', 'finance'],
      dateRange: { start: '2020-01-01', end: '2024-01-01' }
    }
  });

  // Save dataset
  await fs.writeFile('benchmark-dataset.json', JSON.stringify(dataset));

  console.log(`Generated dataset:
    Vectors: ${dataset.vectors.length}
    Queries: ${dataset.queries.length}
    Ground Truth: ${dataset.groundTruth.length}
  `);

  return dataset;
}
```

### Recall Benchmark

```typescript
// Measure search accuracy
async function benchmarkRecall(collection: string, dataset: any) {
  const results = [];

  for (let i = 0; i < dataset.queries.length; i++) {
    const query = dataset.queries[i];
    const groundTruth = dataset.groundTruth[i];

    const searchResults = await db.vector.search({
      collection,
      query: query.vector,
      k: 10
    });

    const recall = calculateRecall(
      searchResults.map(r => r.id),
      groundTruth.slice(0, 10)
    );

    results.push(recall);
  }

  const avgRecall = results.reduce((a, b) => a + b) / results.length;

  console.log(`
Recall Benchmark:
  Queries: ${dataset.queries.length}
  Avg Recall@10: ${avgRecall}%
  Min Recall: ${Math.min(...results)}%
  Max Recall: ${Math.max(...results)}%
  `);

  return avgRecall;
}

function calculateRecall(results: string[], groundTruth: string[]): number {
  const matches = results.filter(id => groundTruth.includes(id)).length;
  return (matches / groundTruth.length) * 100;
}
```

### Latency Benchmark

```typescript
// Detailed latency analysis
async function benchmarkLatency(collection: string, queries: number) {
  const latencies: number[] = [];

  for (let i = 0; i < queries; i++) {
    const query = generateRandomVector(1536);
    const start = performance.now();

    await db.vector.search({
      collection,
      query,
      k: 10
    });

    const latency = performance.now() - start;
    latencies.push(latency);
  }

  latencies.sort((a, b) => a - b);

  const percentile = (p: number) =>
    latencies[Math.floor(latencies.length * p)];

  const stats = {
    min: Math.min(...latencies),
    max: Math.max(...latencies),
    mean: latencies.reduce((a, b) => a + b) / latencies.length,
    p50: percentile(0.50),
    p90: percentile(0.90),
    p95: percentile(0.95),
    p99: percentile(0.99),
    p999: percentile(0.999)
  };

  console.log(`
Latency Distribution (${queries} queries):
  Min:  ${stats.min.toFixed(2)}ms
  P50:  ${stats.p50.toFixed(2)}ms
  P90:  ${stats.p90.toFixed(2)}ms
  P95:  ${stats.p95.toFixed(2)}ms
  P99:  ${stats.p99.toFixed(2)}ms
  P99.9: ${stats.p999.toFixed(2)}ms
  Max:  ${stats.max.toFixed(2)}ms
  Mean: ${stats.mean.toFixed(2)}ms
  `);

  return stats;
}
```

### Throughput Benchmark

```typescript
// Measure queries per second
async function benchmarkThroughput(
  collection: string,
  duration: number = 60,
  concurrency: number = 10
) {
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  let queryCount = 0;

  // Run concurrent queries
  const workers = Array.from({ length: concurrency }, async () => {
    while (Date.now() < endTime) {
      const query = generateRandomVector(1536);
      await db.vector.search({
        collection,
        query,
        k: 10
      });
      queryCount++;
    }
  });

  await Promise.all(workers);

  const actualDuration = (Date.now() - startTime) / 1000;
  const qps = queryCount / actualDuration;

  console.log(`
Throughput Benchmark:
  Duration: ${actualDuration.toFixed(2)}s
  Total Queries: ${queryCount}
  QPS: ${qps.toFixed(2)}
  Avg Latency: ${(1000 / qps).toFixed(2)}ms
  Concurrency: ${concurrency}
  `);

  return { qps, queryCount, duration: actualDuration };
}
```

### Memory Profiling

```typescript
// Profile memory usage
async function profileMemory(collection: string, duration: number = 60) {
  const samples: any[] = [];
  const interval = 1000;  // Sample every second

  const sampler = setInterval(async () => {
    const stats = await db.collection.stats({ name: collection });
    const memory = process.memoryUsage();

    samples.push({
      timestamp: Date.now(),
      vectorCount: stats.vectorCount,
      memoryMB: stats.memoryMB,
      heapUsedMB: memory.heapUsed / (1024 * 1024),
      heapTotalMB: memory.heapTotal / (1024 * 1024),
      rssMB: memory.rss / (1024 * 1024)
    });
  }, interval);

  await new Promise(resolve => setTimeout(resolve, duration * 1000));
  clearInterval(sampler);

  const avgMemory = samples.reduce((sum, s) => sum + s.memoryMB, 0) / samples.length;
  const peakMemory = Math.max(...samples.map(s => s.memoryMB));

  console.log(`
Memory Profile (${duration}s):
  Samples: ${samples.length}
  Avg Memory: ${avgMemory.toFixed(2)}MB
  Peak Memory: ${peakMemory.toFixed(2)}MB
  Avg Heap: ${(samples.reduce((s, m) => s + m.heapUsedMB, 0) / samples.length).toFixed(2)}MB
  `);

  return { samples, avgMemory, peakMemory };
}
```

### Index Parameter Tuning

```typescript
// Find optimal HNSW parameters
async function tuneIndexParameters(collection: string) {
  const testConfigs = [
    { m: 8, efConstruction: 100, efSearch: 50 },
    { m: 12, efConstruction: 100, efSearch: 100 },
    { m: 16, efConstruction: 200, efSearch: 100 },
    { m: 24, efConstruction: 200, efSearch: 200 },
    { m: 32, efConstruction: 400, efSearch: 200 }
  ];

  const results = [];

  for (const config of testConfigs) {
    console.log(`Testing M=${config.m}, ef_construction=${config.efConstruction}...`);

    // Create index
    await db.index.createHNSW({
      collection,
      m: config.m,
      efConstruction: config.efConstruction
    });

    // Benchmark
    const bench = await db.bench.run({
      collection,
      queries: 1000,
      k: 10,
      efSearch: config.efSearch
    });

    results.push({
      config,
      recall: bench.recall,
      qps: bench.qps,
      p95Latency: bench.latency.p95,
      buildTime: bench.indexBuildTime
    });

    console.log(`  Recall: ${bench.recall}%, QPS: ${bench.qps.toFixed(2)}, P95: ${bench.latency.p95}ms`);

    // Cleanup
    await db.index.delete({ collection });
  }

  // Find best config based on recall and latency
  const best = results.reduce((best, current) => {
    if (current.recall > 0.95 && current.p95Latency < best.p95Latency) {
      return current;
    }
    return best;
  }, results[0]);

  console.log(`
Best Configuration:
  M: ${best.config.m}
  ef_construction: ${best.config.efConstruction}
  ef_search: ${best.config.efSearch}
  Recall: ${best.recall}%
  QPS: ${best.qps.toFixed(2)}
  P95 Latency: ${best.p95Latency}ms
  `);

  return best;
}
```

### System Comparison

```typescript
// Compare different vector databases
async function compareVectorDatabases(dataset: any) {
  const systems = [
    { name: 'ruvector', client: new RuvectorClient() },
    { name: 'pinecone', client: new PineconeClient() },
    { name: 'weaviate', client: new WeaviateClient() }
  ];

  const results = [];

  for (const system of systems) {
    console.log(`Benchmarking ${system.name}...`);

    // Insert benchmark
    const insertStart = Date.now();
    await system.client.insertBatch(dataset.vectors);
    const insertTime = Date.now() - insertStart;

    // Search benchmark
    const searchMetrics = await benchmarkSearch(system.client, dataset.queries);

    // Memory usage
    const memory = await system.client.getMemoryUsage();

    results.push({
      system: system.name,
      insertTime,
      insertQPS: dataset.vectors.length / (insertTime / 1000),
      searchQPS: searchMetrics.qps,
      p95Latency: searchMetrics.p95,
      recall: searchMetrics.recall,
      memoryGB: memory.gb
    });
  }

  // Print comparison table
  console.table(results);

  return results;
}
```

### Load Testing

```typescript
// Stress test with increasing load
async function loadTest(collection: string) {
  const concurrencyLevels = [1, 5, 10, 20, 50, 100];
  const results = [];

  for (const concurrency of concurrencyLevels) {
    console.log(`Testing with ${concurrency} concurrent clients...`);

    const bench = await db.bench.run({
      collection,
      queries: 1000,
      k: 10,
      concurrency
    });

    results.push({
      concurrency,
      qps: bench.qps,
      p95Latency: bench.latency.p95,
      p99Latency: bench.latency.p99,
      errorRate: bench.errorRate
    });

    console.log(`  QPS: ${bench.qps.toFixed(2)}, P95: ${bench.latency.p95}ms, Errors: ${bench.errorRate}%`);

    // Stop if error rate too high
    if (bench.errorRate > 1) {
      console.log('High error rate detected, stopping load test');
      break;
    }
  }

  // Find saturation point
  const saturationPoint = results.reduce((max, current) =>
    current.qps > max.qps ? current : max
  );

  console.log(`
Saturation Point:
  Max QPS: ${saturationPoint.qps.toFixed(2)}
  Concurrency: ${saturationPoint.concurrency}
  P95 Latency: ${saturationPoint.p95Latency}ms
  `);

  return results;
}
```

### Report Generation

```typescript
// Generate comprehensive HTML report
async function generateBenchmarkReport(results: any) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Benchmark Report</title>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
  <h1>Vector Database Benchmark Report</h1>

  <h2>Summary</h2>
  <table>
    <tr><td>QPS</td><td>${results.qps.toFixed(2)}</td></tr>
    <tr><td>P95 Latency</td><td>${results.latency.p95}ms</td></tr>
    <tr><td>Recall</td><td>${results.recall}%</td></tr>
    <tr><td>Memory</td><td>${results.memoryGB}GB</td></tr>
  </table>

  <h2>Latency Distribution</h2>
  <div id="latency-chart"></div>

  <h2>QPS Over Time</h2>
  <div id="qps-chart"></div>

  <script>
    // Latency histogram
    Plotly.newPlot('latency-chart', [{
      x: ${JSON.stringify(results.latencyBuckets)},
      type: 'histogram'
    }]);

    // QPS time series
    Plotly.newPlot('qps-chart', [{
      x: ${JSON.stringify(results.timestamps)},
      y: ${JSON.stringify(results.qpsValues)},
      type: 'scatter'
    }]);
  </script>
</body>
</html>
  `;

  await fs.writeFile('benchmark-report.html', html);
  console.log('Report generated: benchmark-report.html');
}
```

## Best Practices

### 1. Warmup Phase
```typescript
// Always warmup before benchmarking
await db.bench.run({
  collection: 'test',
  queries: 100,
  warmup: true  // Warmup cache, JIT, etc.
});

// Then run actual benchmark
const results = await db.bench.run({
  collection: 'test',
  queries: 10000
});
```

### 2. Realistic Data
- Use production-like vector distributions
- Include realistic metadata
- Test with actual query patterns
- Account for data growth

### 3. Multiple Runs
```typescript
// Run multiple times and average
const runs = 5;
const allResults = [];

for (let i = 0; i < runs; i++) {
  const results = await db.bench.run({...});
  allResults.push(results);
}

const avgQPS = allResults.reduce((sum, r) => sum + r.qps, 0) / runs;
```

### 4. Monitoring During Benchmarks
- Track CPU usage
- Monitor memory growth
- Check disk I/O
- Watch network traffic

## Troubleshooting

### Inconsistent Results
- Ensure warmup phase
- Run multiple iterations
- Check system load
- Disable background processes

### Low Throughput
- Increase concurrency
- Check network latency
- Review index configuration
- Monitor resource usage

### High Latency
- Reduce ef_search
- Add HNSW index
- Use quantization
- Check for swapping

## Related Skills
- `index-management` - Index optimization
- `metrics` - Performance monitoring
- `server` - API benchmarking
- `cluster-management` - Distributed benchmarking
