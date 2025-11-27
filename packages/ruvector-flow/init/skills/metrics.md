---
name: metrics
description: Monitoring and health checks with Prometheus metrics
tags: [metrics, monitoring, prometheus, health, observability]
category: operations
priority: P1
---

# Metrics Skill

## Overview

Master monitoring and observability with Prometheus metrics, health checks, and performance tracking. Gain deep insights into vector database performance, resource usage, and system health.

## Available Operations

### 1. Export Metrics

```bash
# CLI
ruvector-flow metrics export --format prometheus

# MCP Tool
{
  "tool": "metrics_export",
  "format": "prometheus"
}
```

### 2. Health Check

```bash
# CLI
ruvector-flow health

# MCP Tool
{
  "tool": "health_check"
}
```

### 3. Readiness Probe

```bash
# CLI
ruvector-flow ready

# MCP Tool
{
  "tool": "readiness_check"
}
```

### 4. Liveness Probe

```bash
# CLI
ruvector-flow live

# MCP Tool
{
  "tool": "liveness_check"
}
```

### 5. Custom Metrics

```bash
# CLI
ruvector-flow metrics custom --name "query_latency" --value 42 --labels "collection=docs,k=10"

# MCP Tool
{
  "tool": "metrics_custom",
  "name": "query_latency",
  "value": 42,
  "labels": {"collection": "docs", "k": 10}
}
```

### 6. Metric Histogram

```bash
# CLI
ruvector-flow metrics histogram --name "search_duration" --buckets "0.01,0.05,0.1,0.5,1.0"

# MCP Tool
{
  "tool": "metrics_histogram",
  "name": "search_duration",
  "buckets": [0.01, 0.05, 0.1, 0.5, 1.0]
}
```

## Example Usage

### Prometheus Integration

```typescript
import { RuvectorFlow } from '@ruvector/flow';

const db = new RuvectorFlow({
  metrics: {
    enabled: true,
    port: 9090,
    path: '/metrics',
    prefix: 'ruvector_'
  }
});

await db.init();

// Metrics automatically exposed at http://localhost:9090/metrics
// Example Prometheus scrape config:
/*
scrape_configs:
  - job_name: 'ruvector'
    static_configs:
      - targets: ['localhost:9090']
*/
```

### Built-in Metrics

```typescript
// Standard metrics automatically tracked:

// Vector Operations
// ruvector_vector_insert_total{collection="docs"} 1234
// ruvector_vector_search_total{collection="docs"} 5678
// ruvector_vector_delete_total{collection="docs"} 90

// Search Performance
// ruvector_search_duration_seconds{collection="docs",quantile="0.5"} 0.012
// ruvector_search_duration_seconds{collection="docs",quantile="0.95"} 0.045
// ruvector_search_duration_seconds{collection="docs",quantile="0.99"} 0.089

// Resource Usage
// ruvector_memory_bytes{collection="docs",type="vectors"} 1073741824
// ruvector_memory_bytes{collection="docs",type="index"} 536870912
// ruvector_cpu_usage_percent{node="node1"} 45.2

// Index Stats
// ruvector_index_vectors_total{collection="docs"} 1000000
// ruvector_index_build_duration_seconds{collection="docs"} 123.45
// ruvector_index_recall{collection="docs"} 0.97

// Cluster Stats
// ruvector_cluster_nodes_total{status="healthy"} 3
// ruvector_cluster_shards_total{node="node1"} 8
// ruvector_cluster_replication_lag_seconds{from="node1",to="node2"} 0.5
```

### Custom Metrics

```typescript
// Track application-specific metrics
class MetricsCollector {
  private db: RuvectorFlow;

  async trackSearchLatency(collection: string, durationMs: number) {
    await this.db.metrics.histogram({
      name: 'search_latency_ms',
      value: durationMs,
      labels: { collection },
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000]
    });
  }

  async trackCacheHit(hit: boolean) {
    await this.db.metrics.counter({
      name: 'cache_requests_total',
      value: 1,
      labels: { result: hit ? 'hit' : 'miss' }
    });
  }

  async trackQueueDepth(depth: number) {
    await this.db.metrics.gauge({
      name: 'queue_depth',
      value: depth
    });
  }
}

// Usage
const metrics = new MetricsCollector(db);

const start = Date.now();
const results = await db.vector.search({...});
await metrics.trackSearchLatency('docs', Date.now() - start);
```

### Health Checks

```typescript
// Kubernetes-style health endpoints
app.get('/health', async (req, res) => {
  const health = await db.health.check();

  if (health.status === 'healthy') {
    res.status(200).json(health);
  } else {
    res.status(503).json(health);
  }
});

app.get('/ready', async (req, res) => {
  const ready = await db.health.readiness();

  if (ready.ready) {
    res.status(200).json(ready);
  } else {
    res.status(503).json(ready);
  }
});

app.get('/live', async (req, res) => {
  const live = await db.health.liveness();

  if (live.alive) {
    res.status(200).json(live);
  } else {
    res.status(503).json(live);
  }
});

// Example health response:
/*
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "disk_space": "ok",
    "memory": "warning",
    "cluster": "ok"
  },
  "details": {
    "memory_usage_percent": 85,
    "disk_available_gb": 50,
    "cluster_nodes_healthy": 3
  }
}
*/
```

### Performance Monitoring

```typescript
// Real-time performance dashboard
class PerformanceMonitor {
  private db: RuvectorFlow;
  private interval: NodeJS.Timer;

  start() {
    this.interval = setInterval(async () => {
      await this.collectMetrics();
    }, 10000);  // Every 10 seconds
  }

  async collectMetrics() {
    const metrics = await this.db.metrics.getAll();

    console.log(`
=== Performance Metrics ===
Queries/sec: ${metrics.qps}
Avg Latency: ${metrics.avgLatencyMs}ms
P95 Latency: ${metrics.p95LatencyMs}ms
P99 Latency: ${metrics.p99LatencyMs}ms
Memory Usage: ${metrics.memoryUsageGB}GB
CPU Usage: ${metrics.cpuPercent}%
Disk I/O: ${metrics.diskIOPs} IOPS
Network: ${metrics.networkMbps} Mbps

=== Cache Stats ===
Cache Hit Rate: ${metrics.cacheHitRate}%
Cache Size: ${metrics.cacheSizeMB}MB

=== Index Stats ===
Recall@10: ${metrics.recall10}%
Recall@100: ${metrics.recall100}%
    `);

    // Alert on performance degradation
    if (metrics.p99LatencyMs > 100) {
      this.alert('High P99 latency', metrics);
    }

    if (metrics.memoryUsageGB > 80) {
      this.alert('High memory usage', metrics);
    }
  }

  stop() {
    clearInterval(this.interval);
  }

  private alert(message: string, metrics: any) {
    // Send to alerting system
    console.error(`ALERT: ${message}`, metrics);
  }
}
```

### Grafana Dashboard

```typescript
// Export metrics for Grafana visualization
const grafanaConfig = {
  datasource: 'Prometheus',
  panels: [
    {
      title: 'Query Rate',
      metric: 'rate(ruvector_vector_search_total[5m])',
      type: 'graph'
    },
    {
      title: 'Search Latency',
      metric: 'histogram_quantile(0.95, ruvector_search_duration_seconds)',
      type: 'graph'
    },
    {
      title: 'Memory Usage',
      metric: 'ruvector_memory_bytes',
      type: 'graph'
    },
    {
      title: 'Cluster Health',
      metric: 'ruvector_cluster_nodes_total{status="healthy"}',
      type: 'stat'
    }
  ]
};

// Example PromQL queries for Grafana:
const promqlQueries = {
  // Request rate by collection
  requestRate: 'rate(ruvector_vector_search_total[5m])',

  // Average latency
  avgLatency: 'rate(ruvector_search_duration_seconds_sum[5m]) / rate(ruvector_search_duration_seconds_count[5m])',

  // P95 latency
  p95Latency: 'histogram_quantile(0.95, rate(ruvector_search_duration_seconds_bucket[5m]))',

  // Error rate
  errorRate: 'rate(ruvector_errors_total[5m])',

  // Memory usage trend
  memoryTrend: 'ruvector_memory_bytes',

  // Cache hit rate
  cacheHitRate: 'rate(ruvector_cache_hits_total[5m]) / rate(ruvector_cache_requests_total[5m])'
};
```

### Alerting Rules

```typescript
// Prometheus alerting rules
const alertingRules = `
groups:
  - name: ruvector_alerts
    rules:
      # High latency alert
      - alert: HighSearchLatency
        expr: histogram_quantile(0.95, rate(ruvector_search_duration_seconds_bucket[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High search latency detected"
          description: "P95 latency is {{ $value }}s"

      # High error rate
      - alert: HighErrorRate
        expr: rate(ruvector_errors_total[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      # Low memory
      - alert: LowMemory
        expr: (ruvector_memory_available_bytes / ruvector_memory_total_bytes) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low available memory"
          description: "Only {{ $value | humanizePercentage }} memory available"

      # Node down
      - alert: NodeDown
        expr: up{job="ruvector"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Ruvector node is down"
          description: "Node {{ $labels.instance }} is unreachable"

      # High disk usage
      - alert: HighDiskUsage
        expr: (ruvector_disk_used_bytes / ruvector_disk_total_bytes) > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High disk usage"
          description: "Disk usage is {{ $value | humanizePercentage }}"
`;
```

### Distributed Tracing

```typescript
// OpenTelemetry integration
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('ruvector');

async function tracedSearch(query: number[], collection: string) {
  const span = tracer.startSpan('vector.search', {
    attributes: {
      'collection': collection,
      'query.dimension': query.length
    }
  });

  try {
    const results = await db.vector.search({
      collection,
      query,
      k: 10
    });

    span.setAttributes({
      'results.count': results.length,
      'results.avg_distance': results.reduce((sum, r) => sum + r.distance, 0) / results.length
    });

    return results;
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

## Best Practices

### 1. Metric Naming
```typescript
// Follow Prometheus naming conventions
const metricNames = {
  // Counters (always increasing)
  counters: [
    'ruvector_requests_total',
    'ruvector_errors_total',
    'ruvector_bytes_processed_total'
  ],

  // Gauges (can go up/down)
  gauges: [
    'ruvector_memory_bytes',
    'ruvector_queue_depth',
    'ruvector_active_connections'
  ],

  // Histograms (distributions)
  histograms: [
    'ruvector_request_duration_seconds',
    'ruvector_response_size_bytes',
    'ruvector_batch_size'
  ],

  // Summaries (pre-calculated quantiles)
  summaries: [
    'ruvector_latency_seconds'
  ]
};
```

### 2. Label Cardinality
```typescript
// ✅ GOOD: Low cardinality labels
{
  collection: 'docs',  // ~10 collections
  status: 'success',   // 2-3 statuses
  method: 'search'     // ~5 methods
}

// ❌ BAD: High cardinality labels
{
  user_id: '12345',    // Millions of users
  vector_id: 'abc',    // Millions of vectors
  timestamp: '2024'    // Infinite timestamps
}
```

### 3. Sampling Strategy
```typescript
// Sample high-volume metrics
const sampler = {
  // Always track errors
  errors: 1.0,

  // Sample 10% of successful requests
  success: 0.1,

  // Sample 1% of cache hits
  cacheHits: 0.01
};

if (Math.random() < sampler.success) {
  await db.metrics.counter({
    name: 'requests_total',
    labels: { status: 'success' }
  });
}
```

### 4. Metric Aggregation
```typescript
// Aggregate before exporting
class MetricsAggregator {
  private buffer: Map<string, number> = new Map();

  increment(metric: string, labels: Record<string, string>) {
    const key = `${metric}:${JSON.stringify(labels)}`;
    this.buffer.set(key, (this.buffer.get(key) || 0) + 1);
  }

  async flush() {
    for (const [key, value] of this.buffer.entries()) {
      const [metric, labelsJson] = key.split(':');
      await db.metrics.counter({
        name: metric,
        value,
        labels: JSON.parse(labelsJson)
      });
    }
    this.buffer.clear();
  }
}

// Flush every 10 seconds
setInterval(() => aggregator.flush(), 10000);
```

## Monitoring Dashboards

### Key Metrics to Track
1. **Throughput**: Requests per second
2. **Latency**: P50, P95, P99
3. **Errors**: Error rate and types
4. **Resource Usage**: CPU, memory, disk
5. **Index Health**: Recall, build time
6. **Cluster Health**: Node status, replication lag

## Troubleshooting

### Missing Metrics
- Check metrics port is accessible
- Verify Prometheus scrape config
- Check metric retention period
- Review metric filters

### High Cardinality
- Reduce label dimensions
- Remove user/session IDs from labels
- Aggregate before exporting
- Use sampling

### Slow Queries
- Review metric export interval
- Enable metric caching
- Reduce histogram bucket count
- Use summaries instead of histograms

### Memory Growth
- Check metric retention
- Enable metric pruning
- Reduce label cardinality
- Clear stale metrics

## Related Skills
- `storage` - Storage metrics
- `cluster-management` - Cluster metrics
- `benchmarking` - Performance metrics
- `server` - API metrics
