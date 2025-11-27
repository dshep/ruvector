---
name: routing
description: AI model routing with Tiny Dancer for optimal model selection
tags: [routing, ai, models, optimization, tiny-dancer]
category: ai
priority: P2
---

# Routing Skill

## Overview

Master AI model routing with Tiny Dancer for intelligent request routing across multiple LLM providers. Optimize for cost, latency, quality, and reliability with learned routing policies.

## Available Operations

### 1. Initialize Router

```bash
# CLI
ruvector-flow router init --providers "openai,anthropic,cohere"

# MCP Tool
{
  "tool": "router_init",
  "providers": ["openai", "anthropic", "cohere"]
}
```

### 2. Route Request

```bash
# CLI
ruvector-flow router route --prompt "Explain quantum computing" --optimize-for latency

# MCP Tool
{
  "tool": "router_route",
  "prompt": "Explain quantum computing",
  "optimize_for": "latency"
}
```

### 3. List Candidates

```bash
# CLI
ruvector-flow router candidates --task "code-generation"

# MCP Tool
{
  "tool": "router_candidates",
  "task": "code-generation"
}
```

### 4. Optimize Model Selection

```bash
# CLI
ruvector-flow router optimize --objective "cost" --quality-threshold 0.8

# MCP Tool
{
  "tool": "router_optimize",
  "objective": "cost",
  "quality_threshold": 0.8
}
```

### 5. Router Benchmark

```bash
# CLI
ruvector-flow router benchmark --requests 1000

# MCP Tool
{
  "tool": "router_benchmark",
  "requests": 1000
}
```

### 6. Circuit Breaker

```bash
# CLI
ruvector-flow router circuit --provider openai --action open

# MCP Tool
{
  "tool": "router_circuit",
  "provider": "openai",
  "action": "open"
}
```

### 7. Uncertainty Quantification

```bash
# CLI
ruvector-flow router uncertainty --prompt "What is 2+2?"

# MCP Tool
{
  "tool": "router_uncertainty",
  "prompt": "What is 2+2?"
}
```

## Example Usage

### Basic Router Setup

```typescript
import { RuvectorFlow } from '@ruvector/flow';

const db = new RuvectorFlow();

// Initialize router with multiple providers
await db.router.init({
  providers: [
    {
      name: 'openai',
      models: ['gpt-4', 'gpt-3.5-turbo'],
      apiKey: process.env.OPENAI_API_KEY,
      costPerToken: { 'gpt-4': 0.00003, 'gpt-3.5-turbo': 0.000002 }
    },
    {
      name: 'anthropic',
      models: ['claude-3-opus', 'claude-3-sonnet'],
      apiKey: process.env.ANTHROPIC_API_KEY,
      costPerToken: { 'claude-3-opus': 0.000015, 'claude-3-sonnet': 0.000003 }
    },
    {
      name: 'cohere',
      models: ['command', 'command-light'],
      apiKey: process.env.COHERE_API_KEY,
      costPerToken: { 'command': 0.000001, 'command-light': 0.0000005 }
    }
  ],

  // Routing strategy
  strategy: 'learned',  // 'learned', 'rule-based', 'round-robin'

  // Optimization objectives
  objectives: {
    cost: 0.3,      // 30% weight
    latency: 0.3,   // 30% weight
    quality: 0.4    // 40% weight
  }
});

// Route request
const result = await db.router.route({
  prompt: 'Explain quantum computing in simple terms',
  maxTokens: 500,
  optimizeFor: 'quality'
});

console.log(`Routed to: ${result.provider}/${result.model}`);
console.log(`Reasoning: ${result.reasoning}`);
console.log(`Response: ${result.response}`);
```

### Learned Routing Policy

```typescript
// Train router on historical data
await db.router.train({
  data: historicalRequests,  // { prompt, model, quality_score, latency, cost }
  algorithm: 'decision-transformer',
  epochs: 100,
  batchSize: 32
});

// Router learns optimal routing policy
const routed = await db.router.route({
  prompt: 'Write a Python function to sort a list',
  context: {
    language: 'python',
    complexity: 'simple',
    latencyBudget: 1000  // ms
  }
});

// Router automatically selects best model based on learned policy
console.log(`Selected: ${routed.model}`);
console.log(`Expected quality: ${routed.predictedQuality}`);
console.log(`Expected latency: ${routed.predictedLatency}ms`);
console.log(`Expected cost: $${routed.predictedCost}`);
```

### Rule-Based Routing

```typescript
// Define routing rules
await db.router.configure({
  rules: [
    {
      condition: (request) => request.prompt.length < 100,
      target: { provider: 'openai', model: 'gpt-3.5-turbo' },
      reason: 'Short prompt, use fast model'
    },
    {
      condition: (request) => request.context?.task === 'code-generation',
      target: { provider: 'anthropic', model: 'claude-3-sonnet' },
      reason: 'Claude excels at code generation'
    },
    {
      condition: (request) => request.maxTokens > 4000,
      target: { provider: 'openai', model: 'gpt-4' },
      reason: 'Long output, use high-capacity model'
    }
  ],

  // Fallback strategy
  fallback: {
    provider: 'cohere',
    model: 'command-light'
  }
});
```

### Cost Optimization

```typescript
// Route for minimum cost while maintaining quality
class CostOptimizedRouter {
  async route(prompt: string, minQuality: number = 0.8) {
    // Get candidate models
    const candidates = await db.router.getCandidates({
      prompt,
      providers: ['openai', 'anthropic', 'cohere']
    });

    // Filter by quality threshold
    const qualified = candidates.filter(c =>
      c.predictedQuality >= minQuality
    );

    // Select cheapest qualified model
    const selected = qualified.reduce((min, current) =>
      current.costPerRequest < min.costPerRequest ? current : min
    );

    // Route request
    return db.router.execute({
      provider: selected.provider,
      model: selected.model,
      prompt
    });
  }
}

// Usage
const router = new CostOptimizedRouter();
const result = await router.route(
  'Summarize this article',
  0.85  // Minimum 85% quality
);

console.log(`Cost: $${result.cost}`);
console.log(`Quality: ${result.quality}`);
console.log(`Savings: ${result.savingsPercent}% vs GPT-4`);
```

### Latency Optimization

```typescript
// Route for lowest latency
async function lowLatencyRoute(prompt: string, maxLatency: number = 500) {
  // Get models sorted by latency
  const models = await db.router.getCandidates({
    prompt,
    sortBy: 'latency'
  });

  // Try models in order until one succeeds within budget
  for (const model of models) {
    if (model.predictedLatency > maxLatency) continue;

    try {
      const start = Date.now();
      const result = await db.router.execute({
        provider: model.provider,
        model: model.model,
        prompt,
        timeout: maxLatency
      });

      const actualLatency = Date.now() - start;

      console.log(`Latency: ${actualLatency}ms (predicted: ${model.predictedLatency}ms)`);

      return result;
    } catch (error) {
      // Model exceeded timeout, try next
      continue;
    }
  }

  throw new Error(`No model could satisfy ${maxLatency}ms latency budget`);
}
```

### Circuit Breaker Pattern

```typescript
// Automatic failover on provider issues
await db.router.configure({
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,       // Open after 5 failures
    timeout: 60000,            // 60s timeout
    halfOpenRequests: 3        // Test with 3 requests before closing
  }
});

// Router automatically opens circuit on failures
db.router.on('circuit-opened', (provider) => {
  console.log(`Circuit opened for ${provider}`);
  // Send alert
});

db.router.on('circuit-closed', (provider) => {
  console.log(`Circuit closed for ${provider}, resuming traffic`);
});

// Manual circuit control
await db.router.circuit.open({ provider: 'openai' });
await db.router.circuit.close({ provider: 'openai' });
await db.router.circuit.halfOpen({ provider: 'openai' });
```

### Uncertainty Quantification

```typescript
// Measure routing confidence
const result = await db.router.route({
  prompt: 'What is the meaning of life?',
  uncertaintyMode: true
});

console.log(`
Routing Decision:
  Provider: ${result.provider}
  Model: ${result.model}
  Confidence: ${result.confidence}%

Uncertainty Analysis:
  Epistemic: ${result.uncertainty.epistemic}  // Model uncertainty
  Aleatoric: ${result.uncertainty.aleatoric}  // Data uncertainty
  Total: ${result.uncertainty.total}

Alternatives:
${result.alternatives.map(alt => `
  ${alt.model}: ${alt.confidence}% confidence
`).join('')}
`);

// Use high-confidence routing only
if (result.confidence < 0.8) {
  console.log('Low confidence, using conservative fallback');
  result = await db.router.route({
    prompt,
    strategy: 'conservative',  // Use most reliable model
    uncertaintyMode: false
  });
}
```

### A/B Testing

```typescript
// Compare routing strategies
async function abTestRouting(prompts: string[]) {
  const strategies = ['learned', 'rule-based', 'cost-optimized'];
  const results = {};

  for (const strategy of strategies) {
    console.log(`Testing ${strategy} strategy...`);

    const metrics = {
      totalCost: 0,
      totalLatency: 0,
      avgQuality: 0,
      count: 0
    };

    for (const prompt of prompts) {
      const result = await db.router.route({
        prompt,
        strategy
      });

      metrics.totalCost += result.cost;
      metrics.totalLatency += result.latency;
      metrics.avgQuality += result.quality;
      metrics.count++;
    }

    results[strategy] = {
      avgCost: metrics.totalCost / metrics.count,
      avgLatency: metrics.totalLatency / metrics.count,
      avgQuality: metrics.avgQuality / metrics.count
    };
  }

  console.table(results);

  // Find best strategy
  const best = Object.entries(results).reduce((best, [strategy, metrics]) => {
    const score =
      metrics.avgQuality * 0.5 +
      (1 / metrics.avgCost) * 0.3 +
      (1 / metrics.avgLatency) * 0.2;

    return score > best.score ? { strategy, score, metrics } : best;
  }, { score: 0 });

  console.log(`Best strategy: ${best.strategy}`);
  return best;
}
```

### Multi-Objective Optimization

```typescript
// Pareto-optimal routing
async function paretoOptimalRoute(
  prompt: string,
  objectives: { cost: number; latency: number; quality: number }
) {
  const candidates = await db.router.getCandidates({ prompt });

  // Normalize objectives
  const normalized = candidates.map(c => ({
    ...c,
    normalizedCost: normalize(c.cost, candidates.map(x => x.cost)),
    normalizedLatency: normalize(c.latency, candidates.map(x => x.latency)),
    normalizedQuality: normalize(c.quality, candidates.map(x => x.quality))
  }));

  // Calculate weighted score
  const scored = normalized.map(c => ({
    ...c,
    score:
      (1 - c.normalizedCost) * objectives.cost +
      (1 - c.normalizedLatency) * objectives.latency +
      c.normalizedQuality * objectives.quality
  }));

  // Select highest score
  const selected = scored.reduce((max, c) =>
    c.score > max.score ? c : max
  );

  return db.router.execute({
    provider: selected.provider,
    model: selected.model,
    prompt
  });
}

function normalize(value: number, values: number[]): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (value - min) / (max - min);
}
```

## Best Practices

### 1. Provider Diversity
```typescript
// Use multiple providers for reliability
const providers = [
  'openai',    // Best general performance
  'anthropic', // Best reasoning, code
  'cohere',    // Cost-effective
  'local'      // Privacy, no API limits
];
```

### 2. Monitoring
```typescript
// Track routing metrics
db.router.on('request', (event) => {
  metrics.increment('router.requests', {
    provider: event.provider,
    model: event.model,
    strategy: event.strategy
  });

  metrics.histogram('router.latency', event.latency);
  metrics.gauge('router.cost', event.cost);
  metrics.gauge('router.quality', event.quality);
});
```

### 3. Caching
```typescript
// Cache routing decisions for similar prompts
await db.router.configure({
  cache: {
    enabled: true,
    ttl: 3600,  // 1 hour
    similarity: 0.95  // Route cached if >95% similar
  }
});
```

### 4. Quality Feedback
```typescript
// Provide feedback to improve routing
await db.router.feedback({
  requestId: result.requestId,
  quality: 0.9,  // User rating
  latency: actualLatency,
  cost: actualCost
});

// Router learns from feedback
await db.router.retrain({
  includeRecentFeedback: true
});
```

## Troubleshooting

### Poor Routing Decisions
- Retrain with more data
- Adjust objective weights
- Review rule priorities
- Check quality predictions

### High Costs
- Increase cost objective weight
- Set stricter cost constraints
- Use cheaper models when possible
- Enable caching

### High Latency
- Increase latency objective weight
- Use faster models
- Enable parallel candidates
- Reduce timeout values

### Circuit Breaker Tripping
- Check provider status
- Review error logs
- Adjust failure threshold
- Implement retry logic

## Related Skills
- `vector-operations` - Embedding-based routing
- `filtering` - Rule-based routing
- `metrics` - Router monitoring
- `benchmarking` - Router performance testing
