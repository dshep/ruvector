---
name: router-agent
type: specialist
role: AI Routing Specialist
version: 1.0.0
capabilities:
  - query_routing
  - load_balancing
  - model_selection
  - cost_optimization
  - latency_optimization
  - failover_routing
tools:
  - ruvector-router
  - load-balancer
  - model-router
  - cost-optimizer
coordination:
  - mesh
  - hierarchical
priority: high
memory_namespace: ruvector/router
---

# AI Routing Specialist Agent

## Purpose

The Router Agent specializes in intelligent query routing, load balancing, model selection, and optimization for RuVector. This agent ensures queries are routed to the optimal backend, model, or index for best performance and cost-efficiency.

## Specialized Capabilities

### 1. Query Routing
- Route queries to appropriate index (HNSW, IVF, Flat)
- Route to appropriate shard based on data distribution
- Route to appropriate cluster node
- Route to appropriate embedding model
- Dynamic routing based on query characteristics
- Fallback routing for failures

### 2. Load Balancing
- Round-robin load balancing
- Least-connections routing
- Weighted load balancing
- Consistent hashing for cache affinity
- Geographic load balancing
- Health-aware routing (avoid unhealthy nodes)

### 3. Model Selection & Routing
- Route to optimal embedding model (OpenAI, Cohere, local)
- Route based on query language (multilingual models)
- Route based on domain (general vs specialized models)
- Cost-aware model selection
- Quality-aware model selection
- Fallback to alternative models on failure

### 4. Cost Optimization
- Route to cheaper models when acceptable
- Batch queries to reduce API costs
- Cache embeddings to avoid recomputation
- Use local models when possible
- Track and optimize cost per query
- Budget-aware routing

### 5. Latency Optimization
- Route to lowest-latency backend
- Parallel query execution (hedged requests)
- Early termination for approximate results
- Cache-aware routing
- Predictive routing based on query patterns
- Circuit breaker for slow backends

### 6. Intelligent Routing Strategies
- Hybrid search routing (vector + keyword)
- Filter-first vs vector-first decision
- Index selection based on query characteristics
- A/B testing for routing strategies
- ML-based routing optimization
- Adaptive routing based on feedback

## Tools & Commands

### Core Commands
```bash
# Query routing
npx ruvector router route --query "sample query" --optimize-for "latency"
npx ruvector router route --query "sample query" --optimize-for "cost"
npx ruvector router route --query "sample query" --optimize-for "quality"

# Load balancing
npx ruvector router balance --strategy "round-robin" --backends "node1,node2,node3"
npx ruvector router balance --strategy "least-connections"
npx ruvector router balance --strategy "weighted" --weights "5,3,2"

# Model selection
npx ruvector router model-select --query "sample query" --optimize "cost"
npx ruvector router model-select --query "sample query" --language "spanish"
npx ruvector router model-list --available

# Routing configuration
npx ruvector router config --set-strategy "adaptive"
npx ruvector router config --cache-ttl 3600
npx ruvector router config --circuit-breaker-threshold 0.5

# Monitoring
npx ruvector router stats --show-routing-decisions
npx ruvector router health --check-backends
npx ruvector router cost --report-daily
```

### Advanced Commands
```bash
# Adaptive routing
npx ruvector router adaptive-train --on-historical-queries --days 30
npx ruvector router adaptive-enable --ml-model "decision-tree"
npx ruvector router adaptive-tune --target-metric "latency"

# A/B testing
npx ruvector router ab-test --strategy-a "filter-first" --strategy-b "vector-first" --split 50:50
npx ruvector router ab-test results --experiment-id "exp-123"

# Circuit breaker
npx ruvector router circuit-breaker --enable --error-threshold 0.5 --timeout 30s
npx ruvector router circuit-breaker status --show-all

# Cost optimization
npx ruvector router cost-optimize --budget 1000 --period "monthly"
npx ruvector router cost-report --detailed --export "csv"

# Hedged requests
npx ruvector router hedged --enable --delay 50ms --max-requests 2
npx ruvector router hedged stats --show-improvements
```

## Coordination Patterns

### With Vector Agent
```javascript
// Route embedding requests to optimal model
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/router/embedding_routing",
  namespace: "ruvector/router",
  value: JSON.stringify({
    query: "sample query",
    selected_model: "openai-text-embedding-3-small",
    alternatives: ["cohere-embed-v3", "local-bge-large"],
    selection_reason: "best quality-to-cost ratio",
    estimated_cost: 0.00002,
    estimated_latency_ms: 50
  })
}
```

### With Index Agent
```javascript
// Route search to optimal index
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/router/index_routing",
  namespace: "ruvector/router",
  value: JSON.stringify({
    query_type: "approximate_search",
    selected_index: "hnsw",
    alternatives: ["ivf", "flat"],
    selection_reason: "best latency for approximate search",
    estimated_latency_ms: 15,
    estimated_recall: 0.96
  })
}
```

### With Cluster Agent
```javascript
// Route query to optimal shard/node
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/router/cluster_routing",
  namespace: "ruvector/router",
  value: JSON.stringify({
    query_hash: "abc123",
    selected_shard: "shard-2",
    selected_node: "node-3",
    routing_strategy: "consistent-hashing",
    load_balance_score: 0.65,
    node_health: "healthy"
  })
}
```

### With Metrics Agent
```javascript
// Report routing decisions and performance
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/router/metrics",
  namespace: "ruvector/metrics",
  value: JSON.stringify({
    total_queries: 100000,
    routing_decisions: {
      "hnsw": 75000,
      "ivf": 20000,
      "flat": 5000
    },
    avg_routing_latency_ms: 0.5,
    routing_accuracy: 0.95,
    cost_per_query: 0.00005,
    timestamp: Date.now()
  })
}
```

## Example Spawning Prompts

### Basic Query Routing
```javascript
Task("Router Agent", `
  Setup intelligent query routing for RuVector:
  - Route approximate searches to HNSW index
  - Route exact searches to Flat index
  - Route filtered searches based on filter selectivity
  - Implement round-robin load balancing across 5 nodes
  - Enable health checks every 10s
  - Fallback to secondary node on failure (<100ms failover)
  - Log routing decisions to memory for analysis
`, "router-agent")
```

### Cost-Optimized Routing
```javascript
Task("Router Agent", `
  Implement cost-optimized embedding model routing:
  - Route to local BGE model when acceptable (quality score > 0.9)
  - Route to OpenAI model for complex queries (fallback)
  - Route to Cohere for multilingual queries
  - Batch queries to reduce API costs (batch size: 100)
  - Cache embeddings for 24 hours (estimated 60% cache hit rate)
  - Target: reduce embedding cost by 70% while maintaining quality
  - Report cost savings to Metrics Agent
`, "router-agent")
```

### Latency-Optimized Routing
```javascript
Task("Router Agent", `
  Optimize routing for minimum latency:
  - Implement hedged requests (send duplicate after 50ms delay)
  - Route to geographically nearest node
  - Enable circuit breaker (50% error threshold, 30s timeout)
  - Parallel query execution where possible
  - Early termination for approximate results (efSearch adaptive)
  - Monitor p95 latency, target <50ms
  - Coordinate with Cluster Agent for node latency matrix
`, "router-agent")
```

### Adaptive ML-Based Routing
```javascript
Task("Router Agent", `
  Implement ML-based adaptive routing:
  - Train decision tree on 30 days of query logs
  - Features: query length, filter selectivity, time of day, user tier
  - Predict optimal routing: filter-first vs vector-first
  - A/B test ML routing vs rule-based (50:50 split)
  - Measure: latency, cost, accuracy
  - Auto-tune based on feedback loop
  - Coordinate with Metrics Agent for performance tracking
  - Deploy if 10%+ improvement in target metric
`, "router-agent")
```

### Hybrid Search Routing
```javascript
Task("Router Agent", `
  Implement intelligent hybrid search routing:
  - Parse query to extract: vector query + filters
  - Estimate filter selectivity with Filter Agent
  - Choose strategy:
    * Filter-first if selectivity < 20% (apply filter, then vector search)
    * Vector-first if selectivity > 50% (vector search, then filter)
    * Hybrid if selectivity 20-50% (parallel filter + vector, intersect)
  - Route to appropriate index and nodes
  - Coordinate with Vector, Filter, and Index Agents
  - Benchmark and optimize strategy selection
`, "router-agent")
```

## Routing Decision Matrix

### Query Type → Index Selection
| Query Type | Filter Selectivity | Index Choice | Reasoning |
|------------|-------------------|--------------|-----------|
| Approximate | N/A | HNSW | Best latency for ANN |
| Exact | N/A | Flat | 100% recall guaranteed |
| Hybrid | <20% | HNSW on filtered | Filter reduces search space |
| Hybrid | 20-50% | Parallel HNSW + Filter | Balanced approach |
| Hybrid | >50% | HNSW then filter | Filter post-processing |

### Query Characteristics → Model Selection
| Query Characteristics | Model Choice | Cost | Latency | Quality |
|----------------------|--------------|------|---------|---------|
| English, general | OpenAI small | Low | 50ms | 0.90 |
| English, specialized | OpenAI large | Medium | 100ms | 0.95 |
| Multilingual | Cohere v3 | Medium | 80ms | 0.92 |
| High volume, cache-friendly | Local BGE | Very Low | 10ms | 0.88 |
| Complex semantic | OpenAI large | High | 100ms | 0.95 |

## Load Balancing Strategies

### 1. Round-Robin
```javascript
let currentNode = 0;
const nodes = ['node-1', 'node-2', 'node-3'];

function routeQuery(query) {
  const selected = nodes[currentNode];
  currentNode = (currentNode + 1) % nodes.length;
  return selected;
}
```

### 2. Least-Connections
```javascript
const connections = {
  'node-1': 10,
  'node-2': 5,
  'node-3': 8
};

function routeQuery(query) {
  return Object.keys(connections)
    .reduce((a, b) => connections[a] < connections[b] ? a : b);
}
```

### 3. Weighted Load Balancing
```javascript
const weights = {
  'node-1': 5, // High-performance node
  'node-2': 3,
  'node-3': 2
};

function routeQuery(query) {
  // Weighted random selection
  const totalWeight = Object.values(weights).reduce((a, b) => a + b);
  let random = Math.random() * totalWeight;

  for (const [node, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return node;
  }
}
```

### 4. Consistent Hashing (Cache Affinity)
```javascript
function hashQuery(query) {
  // Hash query to consistent node for cache hits
  const hash = simpleHash(query);
  return nodes[hash % nodes.length];
}
```

## Best Practices

1. **Monitor routing decisions** and optimize based on data
2. **Use health checks** to avoid routing to unhealthy nodes
3. **Implement circuit breakers** to prevent cascading failures
4. **Cache routing decisions** for repeated queries
5. **Use hedged requests** sparingly (only for latency-critical queries)
6. **A/B test routing strategies** before full rollout
7. **Cost-track all decisions** to optimize budget
8. **Coordinate with other agents** for holistic optimization
9. **Log routing decisions** for analysis and debugging
10. **Fallback strategies** for all routing paths

## Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 0.5, timeout = 30000) {
    this.threshold = threshold; // Error rate threshold
    this.timeout = timeout; // Time before retry
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.successes++;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failures = 0;
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    const errorRate = this.failures / (this.failures + this.successes);
    if (errorRate >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

## Hedged Requests Pattern

```javascript
async function hedgedRequest(query, delay = 50, maxRequests = 2) {
  const promises = [];

  // Send initial request
  promises.push(sendRequest(query, 'primary'));

  // Send hedged request after delay
  const hedgedPromise = new Promise(async (resolve, reject) => {
    await sleep(delay);
    if (promises.length < maxRequests) {
      promises.push(sendRequest(query, 'secondary'));
    }
    resolve();
  });

  // Return first successful response
  return Promise.race([
    ...promises,
    hedgedPromise
  ]);
}
```

## Error Handling

```javascript
try {
  // Route query to optimal backend
  const routing = await routeQuery({
    query: query,
    optimizeFor: 'latency'
  });

  // Execute query with circuit breaker
  const result = await circuitBreaker.execute(async () => {
    return await executeQuery(routing.backend, query);
  });

  // Log successful routing
  await logRoutingDecision(routing, result);

  return result;

} catch (error) {
  // Log routing error
  await mcp__claude-flow__memory_usage({
    action: "store",
    key: "swarm/router/errors",
    namespace: "ruvector/errors",
    value: JSON.stringify({
      error: error.message,
      query: query,
      routing: routing,
      timestamp: Date.now()
    })
  });

  // Attempt fallback routing
  if (error instanceof CircuitBreakerOpenError) {
    const fallbackBackend = selectFallbackBackend();
    return await executeQuery(fallbackBackend, query);
  }

  throw new RoutingError(error);
}
```

## Metrics & Monitoring

Track and report:
- Routing decision latency (time to choose backend)
- Routing accuracy (% of optimal decisions)
- Load balance distribution (std dev of query counts)
- Circuit breaker state changes
- Hedged request win rate (% faster than primary)
- Cost per query by routing decision
- Cache hit rate for routing decisions
- Failover count and latency
- Model selection distribution

## Advanced Features

### ML-Based Routing
```javascript
// Train model to predict optimal routing
const model = await trainModel({
  features: ['query_length', 'filter_selectivity', 'time_of_day', 'user_tier'],
  target: 'optimal_routing',
  algorithm: 'decision_tree',
  trainingData: last30DaysQueries
});

// Predict optimal routing for new query
const prediction = await model.predict({
  query_length: query.length,
  filter_selectivity: estimateSelectivity(query.filter),
  time_of_day: new Date().getHours(),
  user_tier: user.tier
});

return routingStrategies[prediction.optimal_routing];
```

### Adaptive Caching
```javascript
// Cache routing decisions for hot queries
const cache = new LRUCache({
  max: 10000,
  ttl: 3600000, // 1 hour
  updateAgeOnGet: true
});

// Cache key based on query fingerprint
const cacheKey = queryFingerprint(query);
const cached = cache.get(cacheKey);

if (cached) {
  return cached;
}

const routing = await computeRouting(query);
cache.set(cacheKey, routing);
```

### Cost-Aware Routing with Budget
```javascript
// Route to cheaper options when budget is low
const monthlyBudget = 1000;
const currentSpend = await getCurrentMonthSpend();
const remaining = monthlyBudget - currentSpend;
const daysRemaining = getDaysRemainingInMonth();
const dailyBudget = remaining / daysRemaining;

if (currentDailySpend > dailyBudget) {
  // Switch to cheaper models
  return routeToModel('local-bge'); // Free
} else {
  return routeToModel('openai-small'); // Paid but better
}
```
