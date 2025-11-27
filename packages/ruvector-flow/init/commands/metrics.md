# Metrics and Monitoring Commands

Prometheus-compatible metrics, health checks, and monitoring operations.

## Commands

### /metrics export

Export metrics in Prometheus format.

**Syntax:**
```bash
/metrics export [options]
```

**Arguments:**
- `--format <format>` - Output format: prometheus, json, openmetrics (default: prometheus)
- `--filter <prefix>` - Filter metrics by prefix
- `--endpoint <url>` - Export to remote endpoint

**Example:**
```bash
/metrics export
/metrics export --format json
/metrics export --filter ruvector_vectors
/metrics export --endpoint http://prometheus:9090/api/v1/write
```

**Prometheus Format Output:**
```
# HELP ruvector_vectors_total Total number of vectors
# TYPE ruvector_vectors_total gauge
ruvector_vectors_total{collection="products"} 100000

# HELP ruvector_search_latency_seconds Vector search latency
# TYPE ruvector_search_latency_seconds histogram
ruvector_search_latency_seconds_bucket{collection="products",le="0.001"} 1250
ruvector_search_latency_seconds_bucket{collection="products",le="0.01"} 9500
ruvector_search_latency_seconds_bucket{collection="products",le="0.1"} 10000
ruvector_search_latency_seconds_sum{collection="products"} 12.5
ruvector_search_latency_seconds_count{collection="products"} 10000

# HELP ruvector_insert_total Total vector insertions
# TYPE ruvector_insert_total counter
ruvector_insert_total{collection="products",status="success"} 100000
ruvector_insert_total{collection="products",status="error"} 15
```

**JSON Format Output:**
```json
{
  "metrics": [
    {
      "name": "ruvector_vectors_total",
      "type": "gauge",
      "value": 100000,
      "labels": {"collection": "products"}
    },
    {
      "name": "ruvector_search_latency_seconds",
      "type": "histogram",
      "buckets": [
        {"le": "0.001", "count": 1250},
        {"le": "0.01", "count": 9500},
        {"le": "0.1", "count": 10000}
      ],
      "sum": 12.5,
      "count": 10000,
      "labels": {"collection": "products"}
    }
  ],
  "timestamp": "2024-01-20T10:30:45Z"
}
```

---

### /health

Health check endpoint for load balancers and orchestrators.

**Syntax:**
```bash
/health [options]
```

**Arguments:**
- `--detailed` - Include detailed health information

**Example:**
```bash
/health
/health --detailed
```

**Returns (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:45Z"
}
```

**Returns (Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-20T10:30:45Z",
  "issues": [
    "Disk space below 10%",
    "Node node-2 unreachable"
  ]
}
```

**Detailed Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:45Z",
  "components": {
    "storage": "healthy",
    "cluster": "healthy",
    "consensus": "healthy",
    "indices": "healthy"
  },
  "metrics": {
    "cpu_usage_percent": 45.2,
    "memory_usage_bytes": 2147483648,
    "disk_usage_percent": 65.3,
    "qps": 850
  }
}
```

---

### /ready

Readiness check for load balancer routing.

**Syntax:**
```bash
/ready
```

**Example:**
```bash
/ready
```

**Returns (Ready):**
```json
{
  "status": "ready",
  "timestamp": "2024-01-20T10:30:45Z"
}
```

**Returns (Not Ready):**
```json
{
  "status": "not_ready",
  "timestamp": "2024-01-20T10:30:45Z",
  "reason": "Initializing indices"
}
```

---

### /live

Liveness check for orchestrator restarts.

**Syntax:**
```bash
/live
```

**Example:**
```bash
/live
```

**Returns:**
```json
{
  "status": "alive",
  "timestamp": "2024-01-20T10:30:45Z",
  "uptime_seconds": 86400
}
```

---

### /metrics custom

Register and export custom application metrics.

**Syntax:**
```bash
/metrics custom --name <name> --type <type> --value <value> [options]
```

**Arguments:**
- `--name <name>` - Metric name
- `--type <type>` - Metric type: counter, gauge, histogram, summary
- `--value <value>` - Metric value
- `--labels <json>` - Labels as JSON object
- `--help-text <text>` - Metric description

**Example:**
```bash
/metrics custom --name app_requests_total --type counter --value 1 --labels '{"endpoint":"/search","status":"200"}'
/metrics custom --name app_processing_time --type histogram --value 0.125 --labels '{"operation":"indexing"}'
/metrics custom --name app_queue_size --type gauge --value 150 --help-text "Current queue size"
```

**Returns:**
```json
{
  "metric": "app_requests_total",
  "type": "counter",
  "value": 1,
  "labels": {"endpoint": "/search", "status": "200"},
  "status": "recorded"
}
```

---

### /metrics histogram

Create histogram metrics for latency tracking.

**Syntax:**
```bash
/metrics histogram --name <name> --buckets <buckets> [options]
```

**Arguments:**
- `--name <name>` - Histogram name
- `--buckets <buckets>` - Comma-separated bucket boundaries
- `--labels <json>` - Labels as JSON object

**Example:**
```bash
/metrics histogram --name search_duration --buckets "0.001,0.01,0.1,1.0,10.0"
/metrics histogram --name insert_duration --buckets "0.0001,0.001,0.01,0.1" --labels '{"collection":"products"}'
```

**Returns:**
```json
{
  "histogram": "search_duration",
  "buckets": [0.001, 0.01, 0.1, 1.0, 10.0],
  "status": "created"
}
```

---

## Standard Metrics

### Vector Operations
```
ruvector_vectors_total{collection}                    # Total vectors
ruvector_insert_total{collection,status}              # Insert operations
ruvector_insert_duration_seconds{collection}          # Insert latency
ruvector_search_total{collection,status}              # Search operations
ruvector_search_duration_seconds{collection}          # Search latency
ruvector_search_results{collection}                   # Results per search
ruvector_delete_total{collection,status}              # Delete operations
ruvector_update_total{collection,status}              # Update operations
```

### Index Metrics
```
ruvector_index_size_bytes{collection,index}           # Index size
ruvector_index_build_duration_seconds{collection}     # Build time
ruvector_index_recall{collection,index,k}             # Search recall
ruvector_index_qps{collection,index}                  # Queries per second
```

### Cluster Metrics
```
ruvector_cluster_nodes{status}                        # Cluster nodes
ruvector_cluster_shards{collection,status}            # Shards
ruvector_cluster_replication_lag_seconds{node}        # Replication lag
ruvector_cluster_consensus_latency_seconds            # Consensus latency
```

### Storage Metrics
```
ruvector_storage_bytes{collection,type}               # Storage usage
ruvector_storage_disk_bytes_total                     # Total disk
ruvector_storage_disk_bytes_available                 # Available disk
ruvector_wal_size_bytes                               # WAL size
ruvector_snapshot_size_bytes{collection}              # Snapshot size
ruvector_compaction_duration_seconds                  # Compaction time
```

### System Metrics
```
ruvector_cpu_usage_percent                            # CPU usage
ruvector_memory_bytes{type}                           # Memory usage
ruvector_goroutines                                   # Go routines (Rust threads)
ruvector_gc_duration_seconds                          # GC duration
```

---

## Health Check Configuration

### Health Criteria
- **Healthy**: All systems operational
- **Degraded**: Minor issues, still serving traffic
- **Unhealthy**: Critical issues, stop serving traffic

### Check Components
1. Storage availability
2. Cluster connectivity
3. Consensus status
4. Resource usage (CPU, memory, disk)
5. Index status

### Thresholds
```bash
# Configure health thresholds
/metrics configure \
  --cpu-threshold 90 \
  --memory-threshold 85 \
  --disk-threshold 90 \
  --cluster-health-required true
```

---

## Prometheus Integration

### Scrape Configuration
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'ruvector'
    static_configs:
      - targets: ['localhost:6333']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Dashboard

**Key Panels:**
1. QPS (Queries Per Second)
2. P50/P95/P99 Latencies
3. Vector Count Over Time
4. Storage Usage
5. Cluster Health
6. Error Rate

**Example PromQL Queries:**
```promql
# QPS
rate(ruvector_search_total[1m])

# P95 Search Latency
histogram_quantile(0.95, rate(ruvector_search_duration_seconds_bucket[5m]))

# Error Rate
rate(ruvector_search_total{status="error"}[1m]) / rate(ruvector_search_total[1m])

# Storage Growth
rate(ruvector_storage_bytes[1h])
```

---

## Alerting Rules

### Prometheus Alerts
```yaml
groups:
  - name: ruvector
    interval: 30s
    rules:
      - alert: HighSearchLatency
        expr: histogram_quantile(0.95, rate(ruvector_search_duration_seconds_bucket[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High search latency detected"

      - alert: HighErrorRate
        expr: rate(ruvector_search_total{status="error"}[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 1%"

      - alert: DiskSpaceLow
        expr: ruvector_storage_disk_bytes_available / ruvector_storage_disk_bytes_total < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space below 10%"

      - alert: ClusterNodeDown
        expr: ruvector_cluster_nodes{status="unhealthy"} > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Cluster node is down"
```

---

## Kubernetes Integration

### Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /live
    port: 6333
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 6333
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  successThreshold: 1
  failureThreshold: 3
```

### Service Monitor
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ruvector
spec:
  selector:
    matchLabels:
      app: ruvector
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

---

## Best Practices

### Metric Naming
- Use `ruvector_` prefix for all metrics
- Include units in name (`_seconds`, `_bytes`, `_total`)
- Use snake_case naming
- Add meaningful labels

### Cardinality
- Limit unique label combinations
- Avoid high-cardinality labels (user IDs, request IDs)
- Use aggregation for high-dimensional data

### Retention
- Configure appropriate retention in Prometheus
- Balance storage cost vs. historical data needs
- Use recording rules for expensive queries

### Performance
- Efficient metric collection (<1ms overhead)
- Sampling for high-frequency events
- Aggregation at source when possible

---

## Common Options

- `--format <format>` - Output format: prometheus, json, openmetrics
- `--verbose, -v` - Verbose output
- `--help, -h` - Show command help

## Notes

- Metrics endpoint is non-blocking
- Health checks have 1-second timeout
- Readiness checks verify index availability
- Liveness checks only verify process is running
- Custom metrics persist across restarts if WAL is enabled
- Histogram buckets are cumulative (le = less than or equal)
