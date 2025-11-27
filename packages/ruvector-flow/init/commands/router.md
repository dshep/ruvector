# AI Router Commands

Tiny Dancer AI routing system for intelligent model selection and optimization.

## Commands

### /router init

Initialize the AI routing system.

**Syntax:**
```bash
/router init [options]
```

**Arguments:**
- `--models <models>` - Comma-separated list of model names or endpoints
- `--strategy <strategy>` - Routing strategy: uncertainty, latency, cost, adaptive (default: adaptive)
- `--fallback <model>` - Fallback model if primary fails
- `--config <file>` - Configuration file path

**Example:**
```bash
/router init --models "gpt-4,claude-3,gemini-pro"
/router init --models "http://model1:8000,http://model2:8000" --strategy latency
/router init --config router-config.json --fallback gpt-3.5-turbo
```

**Returns:**
```json
{
  "router_id": "router-abc123",
  "models": [
    {
      "id": "gpt-4",
      "endpoint": "https://api.openai.com/v1",
      "status": "active",
      "capabilities": ["chat", "completion"]
    },
    {
      "id": "claude-3",
      "endpoint": "https://api.anthropic.com/v1",
      "status": "active",
      "capabilities": ["chat", "completion"]
    }
  ],
  "strategy": "adaptive",
  "fallback": "gpt-3.5-turbo",
  "status": "initialized"
}
```

---

### /router route

Route a request to the optimal model.

**Syntax:**
```bash
/router route --prompt <prompt> [options]
```

**Arguments:**
- `--prompt <prompt>` - Input prompt or request
- `--task <task>` - Task type: chat, completion, embedding, classification
- `--constraints <json>` - Constraints as JSON (max_latency, max_cost, min_quality)
- `--metadata <json>` - Request metadata for routing decision
- `--explain` - Include routing explanation

**Example:**
```bash
/router route --prompt "Explain quantum computing" --task chat
/router route --prompt "Summarize this article" --constraints '{"max_latency":1000,"max_cost":0.01}'
/router route --prompt "Classify sentiment" --task classification --explain
```

**Returns:**
```json
{
  "request_id": "req-xyz789",
  "selected_model": "claude-3",
  "routing_decision": {
    "strategy": "adaptive",
    "confidence": 0.92,
    "factors": {
      "task_match": 0.95,
      "latency_prediction": 450,
      "cost_prediction": 0.005,
      "quality_prediction": 0.94
    }
  },
  "alternatives": [
    {
      "model": "gpt-4",
      "score": 0.87,
      "latency_prediction": 650,
      "cost_prediction": 0.015
    }
  ],
  "response": {
    "content": "Quantum computing is...",
    "model": "claude-3",
    "tokens": 150,
    "latency_ms": 425,
    "cost": 0.0048
  }
}
```

**With Explanation:**
```json
{
  "selected_model": "claude-3",
  "explanation": {
    "reasoning": "Claude-3 selected for complex reasoning task",
    "task_type": "chat",
    "uncertainty_score": 0.15,
    "decision_factors": [
      "Low uncertainty (0.15 < threshold 0.3)",
      "Predicted latency 450ms within constraint 1000ms",
      "Predicted cost $0.005 within constraint $0.01",
      "High quality score (0.94) for reasoning tasks",
      "Model has 95% success rate for similar requests"
    ]
  }
}
```

---

### /router candidates

List candidate models for a given request.

**Syntax:**
```bash
/router candidates --prompt <prompt> [options]
```

**Arguments:**
- `--prompt <prompt>` - Input prompt
- `--task <task>` - Task type
- `--constraints <json>` - Constraints
- `--top-k <k>` - Number of candidates (default: 5)

**Example:**
```bash
/router candidates --prompt "Translate to French" --task translation
/router candidates --prompt "Generate code" --constraints '{"max_cost":0.005}' --top-k 3
```

**Returns:**
```json
{
  "prompt": "Translate to French",
  "task": "translation",
  "candidates": [
    {
      "rank": 1,
      "model": "gpt-4",
      "score": 0.95,
      "predictions": {
        "latency_ms": 350,
        "cost": 0.008,
        "quality": 0.97,
        "success_rate": 0.99
      },
      "reasoning": "Best quality for translation tasks"
    },
    {
      "rank": 2,
      "model": "claude-3",
      "score": 0.92,
      "predictions": {
        "latency_ms": 400,
        "cost": 0.006,
        "quality": 0.95,
        "success_rate": 0.98
      },
      "reasoning": "Good balance of quality and cost"
    },
    {
      "rank": 3,
      "model": "gemini-pro",
      "score": 0.88,
      "predictions": {
        "latency_ms": 300,
        "cost": 0.004,
        "quality": 0.92,
        "success_rate": 0.96
      },
      "reasoning": "Fastest response time"
    }
  ]
}
```

---

### /router optimize

Optimize routing model based on historical data.

**Syntax:**
```bash
/router optimize [options]
```

**Arguments:**
- `--algorithm <algo>` - Optimization algorithm: gradient-descent, bayesian, evolutionary (default: bayesian)
- `--epochs <n>` - Training epochs (default: 100)
- `--metric <metric>` - Optimization metric: accuracy, latency, cost, f1-score (default: accuracy)
- `--data <file>` - Historical routing data file

**Example:**
```bash
/router optimize
/router optimize --algorithm bayesian --epochs 200 --metric f1-score
/router optimize --data routing-history.json --metric cost
```

**Returns:**
```json
{
  "optimization": {
    "algorithm": "bayesian",
    "epochs": 100,
    "metric": "accuracy"
  },
  "results": {
    "before": {
      "accuracy": 0.85,
      "avg_latency_ms": 550,
      "avg_cost": 0.012
    },
    "after": {
      "accuracy": 0.92,
      "avg_latency_ms": 480,
      "avg_cost": 0.009
    },
    "improvement": {
      "accuracy": "+8.2%",
      "latency": "-12.7%",
      "cost": "-25.0%"
    }
  },
  "model_weights": {
    "gpt-4": 0.35,
    "claude-3": 0.45,
    "gemini-pro": 0.20
  },
  "duration_seconds": 45.3
}
```

---

### /router benchmark

Benchmark routing performance and accuracy.

**Syntax:**
```bash
/router benchmark [options]
```

**Arguments:**
- `--dataset <file>` - Test dataset file
- `--requests <n>` - Number of test requests (default: 1000)
- `--parallel <n>` - Parallel requests (default: 1)
- `--compare <strategies>` - Compare strategies (comma-separated)

**Example:**
```bash
/router benchmark --requests 5000
/router benchmark --dataset test-prompts.json --parallel 10
/router benchmark --compare "uncertainty,latency,cost,adaptive"
```

**Returns:**
```json
{
  "benchmark": "router-performance",
  "requests": 5000,
  "duration_seconds": 120.5,
  "results": {
    "routing_accuracy": 0.92,
    "avg_routing_time_ms": 2.5,
    "avg_request_latency_ms": 485.3,
    "avg_cost": 0.0089,
    "total_cost": 44.50,
    "model_distribution": {
      "gpt-4": 1750,
      "claude-3": 2250,
      "gemini-pro": 1000
    },
    "strategy_comparison": [
      {
        "strategy": "adaptive",
        "accuracy": 0.92,
        "avg_latency_ms": 485.3,
        "avg_cost": 0.0089
      },
      {
        "strategy": "uncertainty",
        "accuracy": 0.89,
        "avg_latency_ms": 520.7,
        "avg_cost": 0.0095
      },
      {
        "strategy": "latency",
        "accuracy": 0.85,
        "avg_latency_ms": 420.1,
        "avg_cost": 0.0078
      }
    ]
  }
}
```

---

### /router circuit

Configure circuit breaker for model failures.

**Syntax:**
```bash
/router circuit [options]
```

**Arguments:**
- `--enable` - Enable circuit breaker
- `--disable` - Disable circuit breaker
- `--threshold <n>` - Failure threshold (default: 5)
- `--timeout <ms>` - Circuit open timeout (default: 30000)
- `--half-open-requests <n>` - Test requests in half-open state (default: 3)

**Example:**
```bash
/router circuit --enable --threshold 10 --timeout 60000
/router circuit --enable --half-open-requests 5
/router circuit --disable
```

**Returns:**
```json
{
  "circuit_breaker": {
    "enabled": true,
    "threshold": 10,
    "timeout_ms": 60000,
    "half_open_requests": 5
  },
  "status": {
    "gpt-4": {
      "state": "closed",
      "failures": 0,
      "last_failure": null
    },
    "claude-3": {
      "state": "half-open",
      "failures": 8,
      "last_failure": "2024-01-20T10:25:00Z",
      "test_requests": 2
    },
    "gemini-pro": {
      "state": "open",
      "failures": 15,
      "last_failure": "2024-01-20T10:28:00Z",
      "reopen_at": "2024-01-20T10:29:00Z"
    }
  }
}
```

---

### /router uncertainty

Quantify uncertainty for routing decisions.

**Syntax:**
```bash
/router uncertainty --prompt <prompt> [options]
```

**Arguments:**
- `--prompt <prompt>` - Input prompt
- `--task <task>` - Task type
- `--method <method>` - Uncertainty method: ensemble, dropout, bayesian (default: ensemble)

**Example:**
```bash
/router uncertainty --prompt "Explain relativity" --task chat
/router uncertainty --prompt "Classify this" --method bayesian
```

**Returns:**
```json
{
  "prompt": "Explain relativity",
  "uncertainty": {
    "score": 0.25,
    "level": "low",
    "method": "ensemble",
    "confidence": 0.75
  },
  "routing_recommendation": {
    "model": "claude-3",
    "reasoning": "Low uncertainty allows using efficient model",
    "alternative_if_high_uncertainty": "gpt-4"
  },
  "uncertainty_breakdown": {
    "semantic_ambiguity": 0.15,
    "task_complexity": 0.10,
    "domain_novelty": 0.05
  }
}
```

---

## Routing Strategies

### Uncertainty-Based
Routes based on prediction uncertainty:
- **Low uncertainty**: Use faster, cheaper models
- **High uncertainty**: Use more capable models
- **Threshold**: Configurable (default: 0.3)

### Latency-Based
Optimizes for response time:
- Predicts latency for each model
- Selects fastest model meeting quality threshold
- Considers current load

### Cost-Based
Minimizes inference cost:
- Predicts cost per request
- Balances cost vs. quality
- Enforces budget constraints

### Adaptive
Learns optimal routing over time:
- Combines multiple factors
- Updates based on feedback
- Adapts to changing patterns

---

## Circuit Breaker States

### Closed (Normal)
- All requests pass through
- Failures are counted
- Transitions to Open at threshold

### Open (Failure)
- All requests fail fast
- No requests sent to model
- Transitions to Half-Open after timeout

### Half-Open (Testing)
- Limited test requests allowed
- Monitors success rate
- Transitions to Closed if successful, Open if failed

---

## Optimization Techniques

### Bayesian Optimization
- Efficient hyperparameter search
- Requires fewer iterations
- Good for expensive evaluations

### Gradient Descent
- Fast convergence
- Requires differentiable metrics
- Good for large datasets

### Evolutionary Algorithms
- Explores diverse solutions
- Handles non-differentiable metrics
- Good for complex landscapes

---

## Best Practices

### Model Configuration
1. Include diverse model capabilities
2. Configure accurate cost/latency metrics
3. Set appropriate fallback models
4. Monitor model health continuously

### Routing Strategy
1. Start with adaptive strategy
2. Optimize based on historical data
3. Set realistic constraints
4. Use circuit breakers for reliability

### Performance
1. Benchmark routing overhead (<5ms)
2. Cache routing decisions when possible
3. Use parallel candidate evaluation
4. Monitor prediction accuracy

### Cost Management
1. Set budget constraints
2. Track actual vs. predicted costs
3. Optimize for cost-quality tradeoff
4. Use cheaper models for simple tasks

---

## Common Options

- `--format <format>` - Output format: json, table (default: json)
- `--verbose, -v` - Verbose output with detailed reasoning
- `--help, -h` - Show command help

## Notes

- Router maintains historical performance data
- Predictions improve over time with feedback
- Circuit breaker prevents cascading failures
- Uncertainty quantification adds <2ms overhead
- Multiple routing strategies can be combined
- Model endpoints are health-checked periodically
- Adaptive strategy requires at least 1000 historical requests
