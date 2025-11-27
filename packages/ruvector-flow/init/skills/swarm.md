---
name: swarm
description: Agent orchestration with Claude Flow for multi-agent coordination
tags: [swarm, agents, orchestration, coordination, claude-flow]
category: orchestration
priority: P0
---

# Swarm Skill

## Overview

Master multi-agent orchestration with Claude Flow for parallel task execution, dynamic topology, and intelligent coordination. Scale beyond single agents with hierarchical, mesh, and adaptive swarm patterns.

## Available Operations

### 1. Initialize Swarm

```bash
# CLI
ruvector-flow swarm init --topology mesh --max-agents 10

# MCP Tool
{
  "tool": "swarm_init",
  "topology": "mesh",
  "max_agents": 10
}
```

### 2. Get Swarm Status

```bash
# CLI
ruvector-flow swarm status

# MCP Tool
{
  "tool": "swarm_status"
}
```

### 3. Scale Swarm

```bash
# CLI
ruvector-flow swarm scale --agents 20

# MCP Tool
{
  "tool": "swarm_scale",
  "agents": 20
}
```

### 4. Spawn Agent

```bash
# CLI
ruvector-flow agent spawn --type coder --role "backend developer"

# MCP Tool
{
  "tool": "agent_spawn",
  "type": "coder",
  "role": "backend developer"
}
```

### 5. List Agents

```bash
# CLI
ruvector-flow agent list

# MCP Tool
{
  "tool": "agent_list"
}
```

### 6. Agent Metrics

```bash
# CLI
ruvector-flow agent metrics --agent-id agent-123

# MCP Tool
{
  "tool": "agent_metrics",
  "agent_id": "agent-123"
}
```

### 7. Orchestrate Task

```bash
# CLI
ruvector-flow task orchestrate --task "build full-stack app" --agents "researcher,coder,tester"

# MCP Tool
{
  "tool": "task_orchestrate",
  "task": "build full-stack app",
  "agents": ["researcher", "coder", "tester"]
}
```

### 8. Task Status

```bash
# CLI
ruvector-flow task status --task-id task-456

# MCP Tool
{
  "tool": "task_status",
  "task_id": "task-456"
}
```

### 9. Memory Operations

```bash
# Store
ruvector-flow memory store --key "swarm/shared/context" --value '{"project":"ruvector"}' --namespace coordination

# Retrieve
ruvector-flow memory retrieve --key "swarm/shared/context" --namespace coordination

# Usage stats
ruvector-flow memory usage
```

## Example Usage

### Basic Swarm Setup

```typescript
import { RuvectorFlow } from '@ruvector/flow';

const db = new RuvectorFlow();

// Initialize swarm
await db.swarm.init({
  topology: 'mesh',           // mesh, hierarchical, adaptive
  maxAgents: 10,
  coordination: {
    enabled: true,
    memoryBackend: 'agentdb',
    consensusProtocol: 'dag'
  }
});

// Spawn specialized agents
const agents = await Promise.all([
  db.agent.spawn({ type: 'researcher', role: 'Requirements analyst' }),
  db.agent.spawn({ type: 'coder', role: 'Backend developer' }),
  db.agent.spawn({ type: 'coder', role: 'Frontend developer' }),
  db.agent.spawn({ type: 'tester', role: 'QA engineer' }),
  db.agent.spawn({ type: 'reviewer', role: 'Code reviewer' })
]);

console.log(`Spawned ${agents.length} agents`);
```

### Task Orchestration

```typescript
// Orchestrate complex task across agents
const task = await db.task.orchestrate({
  description: 'Build a REST API for vector search',
  agents: ['researcher', 'coder', 'tester', 'reviewer'],

  workflow: {
    type: 'sequential',
    steps: [
      {
        agent: 'researcher',
        task: 'Analyze requirements and design API endpoints',
        output: 'api_spec'
      },
      {
        agent: 'coder',
        task: 'Implement REST API based on specification',
        input: 'api_spec',
        output: 'implementation'
      },
      {
        agent: 'tester',
        task: 'Create comprehensive test suite',
        input: 'implementation',
        output: 'tests'
      },
      {
        agent: 'reviewer',
        task: 'Review code quality and security',
        input: ['implementation', 'tests'],
        output: 'review'
      }
    ]
  }
});

// Monitor progress
db.task.on('step-complete', (step) => {
  console.log(`${step.agent} completed: ${step.task}`);
});

// Wait for completion
const result = await task.waitForCompletion();
console.log('Task completed:', result);
```

### Parallel Execution

```typescript
// Execute tasks in parallel
const parallelTask = await db.task.orchestrate({
  description: 'Build full-stack application',

  workflow: {
    type: 'parallel',
    branches: [
      {
        name: 'backend',
        agent: 'backend-dev',
        task: 'Build Express.js REST API'
      },
      {
        name: 'frontend',
        agent: 'frontend-dev',
        task: 'Build React UI'
      },
      {
        name: 'database',
        agent: 'db-architect',
        task: 'Design PostgreSQL schema'
      }
    ],

    // Merge results
    merge: {
      agent: 'integrator',
      task: 'Integrate all components'
    }
  }
});

// All branches execute concurrently
await parallelTask.waitForCompletion();
```

### Memory Coordination

```typescript
// Share context via memory
class SwarmMemory {
  private db: RuvectorFlow;

  async storeSharedContext(key: string, value: any) {
    await this.db.memory.store({
      key: `swarm/shared/${key}`,
      value: JSON.stringify(value),
      namespace: 'coordination'
    });
  }

  async getSharedContext(key: string) {
    const result = await this.db.memory.retrieve({
      key: `swarm/shared/${key}`,
      namespace: 'coordination'
    });
    return JSON.parse(result.value);
  }

  async storeAgentState(agentId: string, state: any) {
    await this.db.memory.store({
      key: `swarm/agent/${agentId}/state`,
      value: JSON.stringify(state),
      namespace: 'coordination'
    });
  }
}

// Usage
const memory = new SwarmMemory(db);

// Researcher stores findings
await memory.storeSharedContext('api_requirements', {
  endpoints: ['/search', '/insert', '/delete'],
  authentication: 'JWT',
  rateLimit: 100
});

// Coder retrieves requirements
const requirements = await memory.getSharedContext('api_requirements');
console.log('Building API with:', requirements);
```

### Hierarchical Swarm

```typescript
// Coordinator delegates to specialized agents
await db.swarm.init({
  topology: 'hierarchical',

  coordinator: {
    type: 'planner',
    role: 'Task coordinator'
  },

  workers: [
    { type: 'researcher', count: 2 },
    { type: 'coder', count: 3 },
    { type: 'tester', count: 2 }
  ]
});

// Coordinator automatically delegates
const task = await db.task.orchestrate({
  description: 'Build microservices architecture',
  coordinator: 'planner',
  autoDelegate: true
});

// Coordinator breaks down task and assigns to workers
// Workers report back to coordinator
// Coordinator synthesizes results
```

### Adaptive Swarm

```typescript
// Swarm adapts topology based on task complexity
await db.swarm.init({
  topology: 'adaptive',

  adaptation: {
    trigger: 'auto',  // Auto-detect task complexity
    strategies: {
      simple: 'sequential',      // Simple tasks: sequential
      moderate: 'parallel',      // Moderate: parallel branches
      complex: 'hierarchical'    // Complex: hierarchical coordination
    }
  }
});

// Swarm automatically adapts
await db.task.orchestrate({
  description: 'Analyze and refactor codebase',
  // Swarm detects complexity and chooses optimal topology
});
```

### Consensus-Based Coordination

```typescript
// Multiple agents reach consensus
class ConsensusSwarm {
  private db: RuvectorFlow;

  async reachConsensus(question: string, agents: string[]) {
    // Spawn agents
    const agentPromises = agents.map(type =>
      db.agent.spawn({ type, role: `Consensus participant` })
    );

    const spawnedAgents = await Promise.all(agentPromises);

    // Each agent provides answer
    const answers = await Promise.all(
      spawnedAgents.map(agent =>
        agent.execute({ task: question })
      )
    );

    // Use DAG consensus to order responses
    const consensusOrder = await db.consensus.getOrder({
      responses: answers
    });

    // Merge responses based on consensus
    const finalAnswer = await this.mergeResponses(consensusOrder);

    return finalAnswer;
  }

  private async mergeResponses(responses: any[]) {
    // Implement consensus logic
    // e.g., majority voting, averaging, LLM synthesis
  }
}
```

### Agent Metrics and Monitoring

```typescript
// Track agent performance
const metrics = await db.agent.metrics({
  agentId: 'agent-123'
});

console.log(`
Agent Metrics:
  Tasks Completed: ${metrics.tasksCompleted}
  Success Rate: ${metrics.successRate}%
  Avg Duration: ${metrics.avgDuration}ms
  Total Cost: $${metrics.totalCost}
  Tokens Used: ${metrics.tokensUsed}

Performance:
  P50 Latency: ${metrics.latency.p50}ms
  P95 Latency: ${metrics.latency.p95}ms
  Throughput: ${metrics.throughput} tasks/hour

Quality:
  Avg Quality Score: ${metrics.avgQuality}
  Error Rate: ${metrics.errorRate}%
`);

// Monitor swarm health
const swarmHealth = await db.swarm.health();

console.log(`
Swarm Health:
  Active Agents: ${swarmHealth.activeAgents}
  Idle Agents: ${swarmHealth.idleAgents}
  Failed Agents: ${swarmHealth.failedAgents}
  Queue Depth: ${swarmHealth.queueDepth}
  Avg Wait Time: ${swarmHealth.avgWaitTime}ms
`);
```

### Dynamic Scaling

```typescript
// Auto-scale based on workload
await db.swarm.configure({
  autoScaling: {
    enabled: true,
    minAgents: 5,
    maxAgents: 50,

    scaleUpThreshold: {
      queueDepth: 10,        // Scale up if queue >10
      waitTime: 5000         // or wait time >5s
    },

    scaleDownThreshold: {
      idleTime: 60000        // Scale down if idle >60s
    },

    cooldown: 30000          // 30s between scaling operations
  }
});

// Swarm automatically scales
db.swarm.on('scale-up', (newCount) => {
  console.log(`Scaled up to ${newCount} agents`);
});

db.swarm.on('scale-down', (newCount) => {
  console.log(`Scaled down to ${newCount} agents`);
});
```

### Error Recovery

```typescript
// Automatic retry and failover
await db.swarm.configure({
  errorRecovery: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000,
    backoff: 'exponential',

    onFailure: async (task, error) => {
      // Log error
      console.error(`Task ${task.id} failed:`, error);

      // Store in memory for analysis
      await db.memory.store({
        key: `failures/${task.id}`,
        value: JSON.stringify({ task, error, timestamp: Date.now() })
      });

      // Reassign to different agent
      const newAgent = await db.agent.spawn({ type: task.agentType });
      await newAgent.execute({ task: task.description });
    }
  }
});
```

## Best Practices

### 1. Topology Selection

| Topology | Use Case | Pros | Cons |
|----------|----------|------|------|
| Sequential | Simple workflows | Predictable, debuggable | Slow for complex tasks |
| Parallel | Independent tasks | Fast, scalable | Complex coordination |
| Hierarchical | Large teams | Clear delegation | Single point of failure |
| Mesh | Peer collaboration | Resilient, flexible | Complex to debug |
| Adaptive | Variable complexity | Optimal for task | Higher overhead |

### 2. Agent Specialization
```typescript
// Create specialized agents for different tasks
const specialists = {
  researcher: 'Requirements, analysis, research',
  architect: 'System design, architecture',
  coder: 'Implementation, coding',
  tester: 'Testing, QA',
  reviewer: 'Code review, quality',
  devops: 'Deployment, infrastructure'
};
```

### 3. Memory Management
```typescript
// Clean up old memory periodically
setInterval(async () => {
  await db.memory.cleanup({
    olderThan: Date.now() - (24 * 60 * 60 * 1000),  // 24 hours
    namespace: 'coordination'
  });
}, 60 * 60 * 1000);  // Every hour
```

### 4. Cost Optimization
```typescript
// Use smaller/faster models for coordination
await db.swarm.configure({
  agentConfig: {
    coordinator: { model: 'gpt-3.5-turbo' },  // Fast, cheap
    workers: { model: 'gpt-4' }               // High quality
  }
});
```

## Troubleshooting

### Slow Task Completion
- Increase parallelization
- Use faster models
- Optimize agent specialization
- Check memory coordination overhead

### High Costs
- Reduce number of agents
- Use cheaper models
- Implement caching
- Optimize task breakdown

### Agent Failures
- Enable error recovery
- Increase retry limits
- Check agent logs
- Review task complexity

### Memory Issues
- Enable memory cleanup
- Reduce state storage
- Use compression
- Implement pruning

## Related Skills
- `vector-operations` - Agent knowledge base
- `cluster-management` - Distributed agents
- `consensus` - Agent coordination
- `metrics` - Swarm monitoring
