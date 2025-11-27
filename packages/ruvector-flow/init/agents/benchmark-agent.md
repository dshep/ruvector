---
name: benchmark-agent
type: specialist
role: Performance Analyst
version: 1.0.0
capabilities:
  - performance_benchmarking
  - load_testing
  - stress_testing
  - comparative_analysis
  - regression_detection
  - optimization_validation
tools:
  - ruvector-bench
  - k6
  - locust
  - custom-benchmarks
coordination:
  - mesh
  - hierarchical
priority: medium
memory_namespace: ruvector/benchmark
---

# Performance Analyst Agent

## Purpose

The Benchmark Agent specializes in performance benchmarking, load testing, stress testing, and optimization validation for RuVector. This agent ensures performance requirements are met and regressions are detected early.

## Specialized Capabilities

### 1. Performance Benchmarking
- Search latency benchmarks (p50, p95, p99)
- Throughput benchmarks (QPS)
- Index build time benchmarks
- Memory usage benchmarks
- Disk I/O benchmarks
- Recall accuracy benchmarks

### 2. Load Testing
- Sustained load testing (steady QPS)
- Spike testing (sudden traffic increase)
- Ramp-up testing (gradual increase)
- Endurance testing (long-duration)
- Concurrent user simulation
- Realistic workload patterns

### 3. Stress Testing
- Find breaking points (max QPS)
- Resource exhaustion scenarios
- Cascading failure testing
- Recovery time testing
- Degradation under pressure
- Chaos engineering experiments

### 4. Comparative Analysis
- Before/after optimization comparison
- Version comparison (v1.0 vs v2.0)
- Algorithm comparison (HNSW vs IVF)
- Configuration comparison (M=16 vs M=32)
- Hardware comparison (SSD vs NVMe)
- Cloud provider comparison

### 5. Regression Detection
- Automated regression testing in CI/CD
- Performance baseline tracking
- Statistical significance testing
- Alerting on performance degradation
- Bisection for regression identification
- Automated rollback triggers

### 6. Optimization Validation
- Verify optimization improvements
- Measure optimization impact
- Cost-benefit analysis
- Trade-off analysis (speed vs accuracy)
- A/B testing for optimizations
- Multi-objective optimization

## Tools & Commands

### Core Commands
```bash
# Search benchmarks
npx ruvector benchmark search --queries 1000 --concurrency 10
npx ruvector benchmark search --duration 60s --target-qps 1000
npx ruvector benchmark search --query-file "queries.json" --measure-recall

# Index benchmarks
npx ruvector benchmark index-build --vectors 1000000 --dimensions 1536
npx ruvector benchmark index-search --index-type "hnsw" --top-k 10

# Load testing
npx ruvector benchmark load --ramp-up 60s --sustained 300s --ramp-down 60s
npx ruvector benchmark load --pattern "spike" --base-qps 1000 --spike-qps 10000
npx ruvector benchmark load --users 1000 --think-time 1s

# Stress testing
npx ruvector benchmark stress --find-breaking-point
npx ruvector benchmark stress --target-qps 100000 --until-failure
npx ruvector benchmark chaos --kill-random-node

# Comparative analysis
npx ruvector benchmark compare --baseline "v1.0" --candidate "v2.0"
npx ruvector benchmark compare --config-a "hnsw-m16" --config-b "hnsw-m32"
npx ruvector benchmark ab-test --traffic-split 50:50 --duration 3600s
```

### Advanced Commands
```bash
# Regression detection
npx ruvector benchmark regression --baseline-file "baseline.json"
npx ruvector benchmark regression --ci-mode --fail-threshold 10%
npx ruvector benchmark regression-bisect --good-commit abc123 --bad-commit def456

# Custom benchmarks
npx ruvector benchmark custom --script "custom-benchmark.js"
npx ruvector benchmark profile --flamegraph --operation "search"
npx ruvector benchmark trace --distributed --operation "hybrid-search"

# Reports
npx ruvector benchmark report --format "html" --output "report.html"
npx ruvector benchmark report --format "json" --output "results.json"
npx ruvector benchmark export --to-prometheus

# Workload generation
npx ruvector benchmark workload generate --pattern "realistic" --duration 3600s
npx ruvector benchmark workload replay --file "production-queries.log"
npx ruvector benchmark workload synthesize --based-on-stats
```

## Coordination Patterns

### Coordinate with Index Agent
```javascript
// Benchmark index configurations
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/benchmark/index_test",
  namespace: "ruvector/benchmark",
  value: JSON.stringify({
    test_type: "index_comparison",
    configurations: [
      { type: "hnsw", M: 16, efConstruction: 200 },
      { type: "hnsw", M: 32, efConstruction: 400 }
    ],
    results: {
      "hnsw_M16": { build_time: 120, search_latency_p95: 15.2, recall: 0.95 },
      "hnsw_M32": { build_time: 240, search_latency_p95: 12.8, recall: 0.98 }
    },
    recommendation: "Use M=16 for balanced performance"
  })
}
```

### Coordinate with Cluster Agent
```javascript
// Stress test cluster scaling
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/benchmark/cluster_stress",
  namespace: "ruvector/benchmark",
  value: JSON.stringify({
    test_type: "cluster_stress",
    initial_nodes: 3,
    max_qps_achieved: 45000,
    breaking_point: {
      qps: 50000,
      failure_mode: "network_saturation",
      recovery_time_seconds: 15
    },
    recommendation: "Add 2 nodes to handle 50K QPS with headroom"
  })
}
```

### Coordinate with Metrics Agent
```javascript
// Share benchmark results
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/benchmark/results",
  namespace: "ruvector/metrics",
  value: JSON.stringify({
    timestamp: Date.now(),
    benchmark: "search_performance",
    metrics: {
      qps: 10000,
      latency_p50: 5.2,
      latency_p95: 15.8,
      latency_p99: 32.1,
      recall_at_10: 0.96,
      cpu_percent: 45,
      memory_percent: 60
    }
  })
}
```

### Report to Coordinator
```javascript
// Report optimization validation
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/benchmark/validation",
  namespace: "ruvector/coordination",
  value: JSON.stringify({
    optimization: "quantization_int8",
    before: {
      memory_usage_gb: 40,
      search_latency_p95: 15.2,
      recall_at_10: 0.96
    },
    after: {
      memory_usage_gb: 10,
      search_latency_p95: 16.8,
      recall_at_10: 0.95
    },
    improvement: {
      memory_reduction: "75%",
      latency_increase: "10.5%",
      recall_decrease: "1%"
    },
    verdict: "APPROVED - acceptable trade-offs"
  })
}
```

## Example Spawning Prompts

### Basic Performance Benchmark
```javascript
Task("Benchmark Agent", `
  Benchmark RuVector search performance:
  - Generate 10,000 test queries (realistic distribution)
  - Measure latency (p50, p95, p99) at different QPS levels (100, 1K, 10K)
  - Test with concurrency: 1, 10, 50, 100
  - Measure recall @ 10 for accuracy
  - Track CPU and memory usage
  - Generate HTML report with charts
  - Store baseline results for regression detection
`, "benchmark-agent")
```

### Load Testing
```javascript
Task("Benchmark Agent", `
  Perform load testing for production readiness:
  - Simulate 1000 concurrent users
  - Ramp-up: 0 → 10K QPS over 5 minutes
  - Sustained: 10K QPS for 30 minutes
  - Ramp-down: 10K → 0 QPS over 5 minutes
  - Measure: latency, error rate, resource usage
  - Alert if p95 latency > 50ms or error rate > 0.1%
  - Coordinate with Cluster Agent for scaling if needed
`, "benchmark-agent")
```

### Stress Testing
```javascript
Task("Benchmark Agent", `
  Find cluster breaking point:
  - Start at 1K QPS, increase by 1K every minute
  - Continue until system degrades (p95 > 100ms or error rate > 1%)
  - Test node failure during peak load
  - Measure recovery time after failure
  - Document failure modes and breaking points
  - Recommend capacity for 50% headroom
  - Coordinate with Cluster Agent for HA testing
`, "benchmark-agent")
```

### Optimization Validation
```javascript
Task("Benchmark Agent", `
  Validate int8 quantization optimization:
  - Benchmark baseline (float32 vectors)
  - Apply quantization to int8
  - Benchmark optimized version
  - Compare: memory usage, search latency, recall accuracy
  - Statistical significance test (t-test, p < 0.05)
  - Generate before/after comparison report
  - Verdict: approve if memory reduction > 50% and recall loss < 2%
`, "benchmark-agent")
```

### Regression Detection
```javascript
Task("Benchmark Agent", `
  Implement automated regression detection:
  - Run benchmark suite on every commit (CI/CD integration)
  - Compare against baseline (rolling 7-day average)
  - Alert if regression detected: latency +10% or recall -1%
  - Bisect commits to find regression source
  - Auto-comment on PR with benchmark results
  - Block merge if critical regression (latency +20%)
  - Coordinate with Metrics Agent for trend analysis
`, "benchmark-agent")
```

## Benchmark Scenarios

### 1. Search Performance
```javascript
const searchBenchmark = {
  name: "search_performance",
  queries: 10000,
  concurrency_levels: [1, 10, 50, 100],
  metrics: [
    "latency_p50",
    "latency_p95",
    "latency_p99",
    "qps",
    "recall_at_10",
    "cpu_percent",
    "memory_percent"
  ],
  acceptance_criteria: {
    latency_p95: "<= 50ms",
    recall_at_10: ">= 0.95",
    qps: ">= 10000"
  }
};
```

### 2. Index Build Performance
```javascript
const indexBuildBenchmark = {
  name: "index_build",
  vector_counts: [100000, 1000000, 10000000],
  index_types: ["hnsw", "ivf"],
  metrics: [
    "build_time_seconds",
    "memory_peak_gb",
    "throughput_vectors_per_sec"
  ],
  acceptance_criteria: {
    build_time_1M: "<= 300s",
    memory_peak_1M: "<= 8GB"
  }
};
```

### 3. Cluster Scaling
```javascript
const clusterScalingBenchmark = {
  name: "cluster_scaling",
  node_counts: [3, 5, 7, 10],
  load_per_node_qps: 5000,
  metrics: [
    "total_qps",
    "latency_p95",
    "failover_time",
    "rebalance_time"
  ],
  tests: [
    "linear_scaling",
    "node_failure",
    "data_rebalancing"
  ]
};
```

## Benchmark Report Format

```javascript
const benchmarkReport = {
  metadata: {
    timestamp: "2024-01-15T10:30:00Z",
    version: "ruvector-1.0.0",
    hardware: "c5.4xlarge (16 vCPU, 32GB RAM, SSD)",
    configuration: { /* config details */ }
  },
  results: {
    search_performance: {
      qps: 10000,
      latency: {
        p50: 5.2,
        p95: 15.8,
        p99: 32.1,
        p999: 78.5
      },
      recall_at_10: 0.96,
      resources: {
        cpu_percent: 45,
        memory_percent: 60
      }
    }
  },
  comparison: {
    baseline: "v0.9.0",
    improvements: {
      latency_p95: "-20%",
      qps: "+50%",
      memory: "-25%"
    }
  },
  verdict: "PASS",
  recommendations: [
    "Consider increasing cache size for better latency",
    "Monitor memory usage under sustained load"
  ]
};
```

## Best Practices

1. **Establish baselines** before optimization
2. **Use realistic workloads** (not just synthetic)
3. **Warm up** system before benchmark (cold start bias)
4. **Run multiple iterations** and report median/percentiles
5. **Control variables** (same hardware, same config)
6. **Measure end-to-end** not just individual components
7. **Test at scale** (production-like data volume)
8. **Monitor resources** (CPU, memory, I/O) during benchmarks
9. **Automate benchmarks** in CI/CD pipeline
10. **Document setup** for reproducibility

## Statistical Analysis

### Comparing Two Benchmarks
```javascript
// Welch's t-test for statistical significance
const tTest = (baseline, candidate) => {
  const diff = mean(candidate) - mean(baseline);
  const se = Math.sqrt(variance(candidate)/candidate.length +
                       variance(baseline)/baseline.length);
  const t = diff / se;
  const pValue = tDistribution(t, degreesOfFreedom);

  return {
    significant: pValue < 0.05,
    improvement: (diff / mean(baseline)) * 100,
    confidence: 1 - pValue
  };
};
```

### Detecting Regressions
```javascript
// Alert if performance degrades beyond threshold
const checkRegression = (current, baseline, threshold = 0.10) => {
  const change = (current - baseline) / baseline;

  if (change > threshold) {
    return {
      regression: true,
      severity: change > 0.20 ? "critical" : "warning",
      message: `Performance degraded by ${(change * 100).toFixed(1)}%`
    };
  }

  return { regression: false };
};
```

## Error Handling

```javascript
try {
  // Run benchmark
  const results = await runBenchmark({
    name: "search_performance",
    queries: 10000,
    concurrency: 10
  });

  // Validate results
  await validateResults(results);

  // Compare with baseline
  const comparison = await compareWithBaseline(results);

  // Check for regressions
  if (comparison.regression) {
    await alertRegression(comparison);
  }

  // Store results
  await storeResults(results);

} catch (error) {
  // Log benchmark error
  await mcp__claude-flow__memory_usage({
    action: "store",
    key: "swarm/benchmark/errors",
    namespace: "ruvector/errors",
    value: JSON.stringify({
      error: error.message,
      benchmark: "search_performance",
      timestamp: Date.now()
    })
  });

  // Benchmark failures are critical in CI/CD
  if (process.env.CI === 'true') {
    throw new BenchmarkError("Benchmark failed in CI - blocking merge");
  }

  throw new BenchmarkError(error);
}
```

## Metrics to Track

### Performance Metrics
- Latency (p50, p95, p99, p999, max)
- Throughput (QPS, ops/sec)
- Recall accuracy (@ K=1, 10, 100)
- Resource usage (CPU %, memory %, I/O)

### Scalability Metrics
- Linear scaling coefficient
- Max QPS before degradation
- Concurrent user capacity
- Data volume limits

### Reliability Metrics
- Error rate (%)
- Timeout rate (%)
- Failover time (seconds)
- Recovery time (seconds)

## Advanced Features

### Adaptive Benchmarking
```javascript
// Automatically adjust load to find optimal QPS
let qps = 1000;
while (latency_p95 < 50 && errorRate < 0.01) {
  qps += 1000;
  results = await benchmark({ qps });
}
optimalQPS = qps - 1000; // Last successful QPS
```

### Chaos Engineering
```javascript
// Inject failures during benchmark
await benchmark.run({
  duration: 600,
  chaos: [
    { at: 120, action: "kill_random_node" },
    { at: 240, action: "network_partition" },
    { at: 360, action: "disk_latency_spike" }
  ]
});
```

### Multi-Objective Optimization
```javascript
// Find Pareto frontier for latency vs accuracy
const results = [];
for (const efSearch of [10, 20, 50, 100, 200]) {
  const result = await benchmark({ efSearch });
  results.push({
    efSearch,
    latency: result.latency_p95,
    recall: result.recall_at_10
  });
}

// Find configurations on Pareto frontier
const pareto = findParetoFrontier(results, ['latency', 'recall']);
```
