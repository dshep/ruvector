# Benchmark Commands

Performance testing and benchmarking operations for RuVector.

## Commands

### /bench run

Run comprehensive benchmarks on vector operations.

**Syntax:**
```bash
/bench run [options]
```

**Arguments:**
- `--collection <name>` - Target collection (creates if not exists)
- `--dimensions <dim>` - Vector dimensions (default: 384)
- `--vectors <n>` - Number of vectors to test (default: 10000)
- `--queries <n>` - Number of search queries (default: 1000)
- `--k <k>` - Number of results per search (default: 10)
- `--threads <n>` - Concurrent threads (default: auto)
- `--duration <seconds>` - Benchmark duration (alternative to --queries)
- `--warmup <seconds>` - Warmup period (default: 5)
- `--operations <ops>` - Operations to benchmark: insert, search, update, delete (comma-separated, default: all)

**Example:**
```bash
/bench run --vectors 100000 --queries 10000
/bench run --collection bench-384 --dimensions 384 --vectors 50000
/bench run --operations "insert,search" --threads 8 --duration 60
/bench run --dimensions 768 --k 100 --warmup 10
```

**Returns:**
```json
{
  "benchmark": "vector-operations",
  "collection": "bench-384",
  "configuration": {
    "dimensions": 384,
    "vectors": 100000,
    "queries": 10000,
    "k": 10,
    "threads": 8
  },
  "results": {
    "insert": {
      "total_operations": 100000,
      "duration_seconds": 50.5,
      "throughput_ops": 1980.2,
      "latency": {
        "min_ms": 0.15,
        "max_ms": 125.3,
        "mean_ms": 0.48,
        "p50_ms": 0.42,
        "p95_ms": 1.25,
        "p99_ms": 3.45
      }
    },
    "search": {
      "total_operations": 10000,
      "duration_seconds": 12.3,
      "throughput_qps": 813.0,
      "latency": {
        "min_ms": 0.85,
        "max_ms": 45.2,
        "mean_ms": 1.23,
        "p50_ms": 1.15,
        "p95_ms": 2.85,
        "p99_ms": 8.45
      },
      "recall": {
        "at_1": 0.998,
        "at_10": 0.985,
        "at_100": 0.972
      }
    }
  },
  "system_stats": {
    "cpu_usage_percent": 65.3,
    "memory_usage_bytes": 5368709120,
    "disk_io_mbps": 145.2
  }
}
```

---

### /bench generate

Generate synthetic vector datasets for testing.

**Syntax:**
```bash
/bench generate --output <file> [options]
```

**Arguments:**
- `--output <file>` - Output file path
- `--dimensions <dim>` - Vector dimensions (default: 384)
- `--count <n>` - Number of vectors (default: 10000)
- `--distribution <dist>` - Distribution: uniform, normal, clustered (default: uniform)
- `--clusters <n>` - Number of clusters for clustered distribution (default: 10)
- `--format <format>` - Output format: json, csv, ndjson, binary (default: json)
- `--with-payload` - Include random payload data
- `--seed <seed>` - Random seed for reproducibility

**Example:**
```bash
/bench generate --output dataset.json --dimensions 384 --count 100000
/bench generate --output embeddings.csv --dimensions 768 --count 50000 --format csv
/bench generate --output clustered.json --distribution clustered --clusters 20 --with-payload
/bench generate --output reproducible.json --seed 42 --count 1000
```

**Returns:**
```json
{
  "output_file": "dataset.json",
  "vectors_generated": 100000,
  "dimensions": 384,
  "distribution": "uniform",
  "file_size_bytes": 157286400,
  "generation_time_seconds": 8.5,
  "format": "json"
}
```

**Output Format (JSON):**
```json
[
  {
    "id": "vec-0",
    "vector": [0.123, -0.456, 0.789, ...],
    "payload": {"category": "A", "value": 42}
  },
  {
    "id": "vec-1",
    "vector": [0.234, -0.567, 0.890, ...],
    "payload": {"category": "B", "value": 17}
  }
]
```

---

### /bench compare

Compare performance across different systems or configurations.

**Syntax:**
```bash
/bench compare --systems <systems> [options]
```

**Arguments:**
- `--systems <systems>` - Systems to compare (comma-separated): ruvector, qdrant, milvus, weaviate, pinecone
- `--dimensions <dim>` - Vector dimensions (default: 384)
- `--vectors <n>` - Number of vectors (default: 10000)
- `--queries <n>` - Number of queries (default: 1000)
- `--k <k>` - Number of results (default: 10)
- `--config <file>` - Configuration file for systems

**Example:**
```bash
/bench compare --systems "ruvector,qdrant,milvus"
/bench compare --systems "ruvector,pinecone" --vectors 100000 --queries 10000
/bench compare --systems "ruvector" --config configs.json --dimensions 768
```

**Returns:**
```json
{
  "comparison": "vector-search-performance",
  "configuration": {
    "dimensions": 384,
    "vectors": 10000,
    "queries": 1000,
    "k": 10
  },
  "systems": [
    {
      "name": "ruvector",
      "version": "0.1.0",
      "insert": {
        "throughput_ops": 1980.2,
        "p95_latency_ms": 1.25
      },
      "search": {
        "throughput_qps": 813.0,
        "p95_latency_ms": 2.85,
        "recall_at_10": 0.985
      },
      "memory_usage_mb": 512
    },
    {
      "name": "qdrant",
      "version": "1.7.0",
      "insert": {
        "throughput_ops": 1650.5,
        "p95_latency_ms": 1.85
      },
      "search": {
        "throughput_qps": 720.3,
        "p95_latency_ms": 3.45,
        "recall_at_10": 0.982
      },
      "memory_usage_mb": 648
    }
  ],
  "winner": {
    "insert": "ruvector (+19.9%)",
    "search": "ruvector (+12.9%)",
    "memory": "ruvector (-21.0%)"
  }
}
```

---

### /bench report

Generate detailed benchmark reports.

**Syntax:**
```bash
/bench report --input <file> [options]
```

**Arguments:**
- `--input <file>` - Benchmark results file (JSON)
- `--output <file>` - Output report file
- `--format <format>` - Report format: html, markdown, pdf, json (default: html)
- `--include-charts` - Include performance charts
- `--compare <files>` - Compare multiple benchmark results (comma-separated)

**Example:**
```bash
/bench report --input results.json --output report.html
/bench report --input results.json --format markdown --include-charts
/bench report --compare "run1.json,run2.json,run3.json" --output comparison.html
```

**Returns:**
```json
{
  "report_file": "report.html",
  "format": "html",
  "sections": [
    "Executive Summary",
    "Test Configuration",
    "Performance Results",
    "Latency Distribution",
    "System Resource Usage",
    "Recommendations"
  ],
  "charts_included": true,
  "file_size_bytes": 524288
}
```

---

### /bench latency

Analyze detailed latency statistics and distributions.

**Syntax:**
```bash
/bench latency --operation <op> [options]
```

**Arguments:**
- `--operation <op>` - Operation type: insert, search, update, delete
- `--collection <name>` - Target collection
- `--samples <n>` - Number of samples (default: 10000)
- `--percentiles <p>` - Custom percentiles (comma-separated, e.g., 50,90,95,99,99.9)
- `--histogram` - Show latency histogram
- `--export <file>` - Export raw latency data

**Example:**
```bash
/bench latency --operation search --samples 100000
/bench latency --operation insert --collection products --percentiles "50,75,90,95,99,99.9,99.99"
/bench latency --operation search --histogram --export latencies.csv
```

**Returns:**
```json
{
  "operation": "search",
  "samples": 100000,
  "duration_seconds": 123.4,
  "statistics": {
    "min_ms": 0.85,
    "max_ms": 245.3,
    "mean_ms": 1.23,
    "median_ms": 1.15,
    "stddev_ms": 2.45
  },
  "percentiles": {
    "p50": 1.15,
    "p75": 1.45,
    "p90": 2.15,
    "p95": 2.85,
    "p99": 8.45,
    "p99.9": 45.2,
    "p99.99": 125.8
  },
  "histogram": [
    {"range": "0-1ms", "count": 42500, "percent": 42.5},
    {"range": "1-2ms", "count": 35000, "percent": 35.0},
    {"range": "2-5ms", "count": 18000, "percent": 18.0},
    {"range": "5-10ms", "count": 3500, "percent": 3.5},
    {"range": "10-50ms", "count": 900, "percent": 0.9},
    {"range": "50+ms", "count": 100, "percent": 0.1}
  ]
}
```

---

### /bench memory

Profile memory usage during vector operations.

**Syntax:**
```bash
/bench memory [options]
```

**Arguments:**
- `--collection <name>` - Target collection
- `--vectors <n>` - Number of vectors to insert (default: 10000)
- `--dimensions <dim>` - Vector dimensions (default: 384)
- `--interval <ms>` - Sampling interval (default: 100)
- `--export <file>` - Export memory profile

**Example:**
```bash
/bench memory --vectors 100000
/bench memory --collection products --dimensions 768 --interval 50
/bench memory --vectors 1000000 --export memory-profile.json
```

**Returns:**
```json
{
  "test_duration_seconds": 50.5,
  "vectors_inserted": 100000,
  "dimensions": 384,
  "memory_usage": {
    "initial_bytes": 104857600,
    "peak_bytes": 5368709120,
    "final_bytes": 5242880000,
    "growth_bytes": 5137920000
  },
  "per_vector": {
    "average_bytes": 51379,
    "theoretical_bytes": 1536,
    "overhead_factor": 33.45
  },
  "breakdown": {
    "vectors_bytes": 153600000,
    "indexes_bytes": 4915200000,
    "metadata_bytes": 174080000
  },
  "allocations": {
    "total_count": 1500000,
    "total_bytes": 10737418240,
    "avg_allocation_bytes": 7158
  }
}
```

---

## Benchmark Scenarios

### Throughput Test
Measure maximum insert/search throughput:
```bash
/bench run --vectors 1000000 --queries 100000 --threads 16
```

### Latency Test
Measure low-latency search performance:
```bash
/bench run --vectors 100000 --queries 10000 --threads 1
```

### Recall Test
Measure search accuracy:
```bash
/bench run --vectors 100000 --queries 1000 --k 100
```

### Stress Test
Test under heavy load:
```bash
/bench run --duration 3600 --threads 32 --vectors 10000000
```

### Memory Test
Test memory efficiency:
```bash
/bench memory --vectors 10000000 --dimensions 1536
```

---

## Performance Baselines

### RuVector Expected Performance

**Small Dataset (10K vectors, 384D):**
- Insert: 2000-5000 ops/s
- Search: 1000-2000 qps
- P95 latency: <3ms
- Memory: 50-100 MB

**Medium Dataset (1M vectors, 384D):**
- Insert: 1500-3000 ops/s
- Search: 800-1500 qps
- P95 latency: <5ms
- Memory: 5-10 GB

**Large Dataset (10M vectors, 384D):**
- Insert: 1000-2000 ops/s
- Search: 500-1000 qps
- P95 latency: <10ms
- Memory: 50-100 GB

---

## Comparison Systems

### Supported Systems
- **RuVector**: Rust-based, HNSW, quantization
- **Qdrant**: Rust, HNSW, filtering
- **Milvus**: Go/C++, multiple indexes
- **Weaviate**: Go, HNSW, ML models
- **Pinecone**: Managed service

### Configuration Files
```json
{
  "ruvector": {
    "index": "hnsw",
    "m": 16,
    "ef_construction": 200,
    "quantization": "scalar"
  },
  "qdrant": {
    "index": "hnsw",
    "m": 16,
    "ef_construct": 200
  }
}
```

---

## Best Practices

### Benchmarking
1. **Warm up** before measuring
2. **Run multiple times** for consistency
3. **Use realistic data** distributions
4. **Test different scales** (10K, 100K, 1M, 10M)
5. **Monitor system resources** during tests
6. **Document configuration** for reproducibility

### Dataset Generation
- Use `--seed` for reproducible datasets
- Match production data characteristics
- Include payload data for realistic tests
- Test with clustered data for similarity search

### Reporting
- Include system specifications (CPU, RAM, disk)
- Document all configuration parameters
- Compare against baselines
- Include percentile latencies (not just averages)
- Visualize results with charts

---

## Common Options

- `--format <format>` - Output format: json, table, csv (default: json)
- `--verbose, -v` - Verbose output with progress
- `--quiet, -q` - Minimal output
- `--help, -h` - Show command help

## Notes

- Benchmarks create temporary collections unless specified
- Use `--threads` to simulate concurrent load
- Recall is measured against brute-force ground truth
- Memory profiling has minimal performance overhead (<1%)
- Export raw data for custom analysis
- Clean up benchmark collections after tests
- Run benchmarks during low-traffic periods
