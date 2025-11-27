# Swarm Orchestration Commands

Multi-agent coordination and swarm management operations from Claude-Flow.

## Commands

### /swarm init

Initialize a swarm with specified topology and agents.

**Syntax:**
```bash
/swarm init [options]
```

**Arguments:**
- `--topology <topology>` - Swarm topology: mesh, hierarchical, hybrid, star, ring (default: mesh)
- `--max-agents <n>` - Maximum concurrent agents (default: 10)
- `--memory-enabled` - Enable shared memory coordination
- `--neural-enabled` - Enable neural pattern learning
- `--consensus <type>` - Consensus mechanism: raft, gossip, dag (default: dag)

**Example:**
```bash
/swarm init --topology mesh --max-agents 5
/swarm init --topology hierarchical --max-agents 20 --memory-enabled --neural-enabled
/swarm init --topology hybrid --consensus raft
```

**Returns:**
```json
{
  "swarm_id": "swarm-abc123",
  "topology": "mesh",
  "max_agents": 5,
  "memory_enabled": true,
  "neural_enabled": false,
  "consensus": "dag",
  "status": "initialized",
  "created_at": "2024-01-20T10:30:45Z"
}
```

---

### /swarm status

Get current swarm status and metrics.

**Syntax:**
```bash
/swarm status [options]
```

**Arguments:**
- `--swarm-id <id>` - Swarm ID (optional, uses current if omitted)
- `--detailed` - Include detailed agent information

**Example:**
```bash
/swarm status
/swarm status --swarm-id swarm-abc123 --detailed
```

**Returns:**
```json
{
  "swarm_id": "swarm-abc123",
  "topology": "mesh",
  "status": "active",
  "uptime_seconds": 3600,
  "agents": {
    "total": 5,
    "active": 4,
    "idle": 1,
    "failed": 0
  },
  "tasks": {
    "completed": 150,
    "active": 8,
    "pending": 12,
    "failed": 2
  },
  "performance": {
    "throughput_tasks_per_min": 25.5,
    "avg_task_duration_seconds": 12.3,
    "success_rate": 0.987
  },
  "memory": {
    "total_keys": 450,
    "size_bytes": 2097152,
    "hit_rate": 0.85
  }
}
```

**Detailed Response:**
```json
{
  "swarm_id": "swarm-abc123",
  "agents": [
    {
      "agent_id": "agent-1",
      "type": "coder",
      "status": "active",
      "current_task": "implement-auth",
      "tasks_completed": 45,
      "uptime_seconds": 3600,
      "cpu_percent": 65.2,
      "memory_mb": 256
    },
    {
      "agent_id": "agent-2",
      "type": "tester",
      "status": "idle",
      "tasks_completed": 38,
      "uptime_seconds": 3600
    }
  ],
  "network": {
    "messages_sent": 2500,
    "messages_received": 2450,
    "avg_latency_ms": 2.5
  }
}
```

---

### /swarm scale

Scale swarm by adding or removing agents.

**Syntax:**
```bash
/swarm scale --agents <n> [options]
```

**Arguments:**
- `--agents <n>` - Target agent count
- `--up <n>` - Scale up by N agents
- `--down <n>` - Scale down by N agents
- `--graceful` - Graceful scale down (wait for task completion)

**Example:**
```bash
/swarm scale --agents 10
/swarm scale --up 5
/swarm scale --down 2 --graceful
```

**Returns:**
```json
{
  "swarm_id": "swarm-abc123",
  "previous_agents": 5,
  "current_agents": 10,
  "scaled": "up",
  "added": 5,
  "removed": 0,
  "status": "scaled"
}
```

---

### /agent spawn

Spawn a new agent in the swarm.

**Syntax:**
```bash
/agent spawn --type <type> [options]
```

**Arguments:**
- `--type <type>` - Agent type (coder, tester, reviewer, researcher, etc.)
- `--name <name>` - Agent name (optional)
- `--config <json>` - Agent configuration as JSON
- `--capabilities <caps>` - Comma-separated capabilities
- `--auto-assign` - Auto-assign tasks to agent

**Example:**
```bash
/agent spawn --type coder --auto-assign
/agent spawn --type tester --name test-specialist --config '{"test_framework":"jest"}'
/agent spawn --type researcher --capabilities "web-search,document-analysis"
```

**Returns:**
```json
{
  "agent_id": "agent-6",
  "type": "coder",
  "name": "agent-6",
  "status": "active",
  "swarm_id": "swarm-abc123",
  "capabilities": ["code-generation", "refactoring", "debugging"],
  "auto_assign": true,
  "spawned_at": "2024-01-20T10:35:00Z"
}
```

---

### /agent list

List all agents in the swarm.

**Syntax:**
```bash
/agent list [options]
```

**Arguments:**
- `--status <status>` - Filter by status: active, idle, failed
- `--type <type>` - Filter by agent type
- `--format <format>` - Output format: json, table (default: table)

**Example:**
```bash
/agent list
/agent list --status active
/agent list --type coder --format json
```

**Returns:**
```json
{
  "swarm_id": "swarm-abc123",
  "agents": [
    {
      "id": "agent-1",
      "type": "coder",
      "status": "active",
      "current_task": "implement-auth",
      "tasks_completed": 45
    },
    {
      "id": "agent-2",
      "type": "tester",
      "status": "idle",
      "current_task": null,
      "tasks_completed": 38
    },
    {
      "id": "agent-3",
      "type": "reviewer",
      "status": "active",
      "current_task": "review-pr-123",
      "tasks_completed": 52
    }
  ],
  "total": 3
}
```

---

### /agent metrics

Get detailed metrics for an agent.

**Syntax:**
```bash
/agent metrics --agent <id>
```

**Arguments:**
- `--agent <id>` - Agent ID

**Example:**
```bash
/agent metrics --agent agent-1
```

**Returns:**
```json
{
  "agent_id": "agent-1",
  "type": "coder",
  "status": "active",
  "uptime_seconds": 3600,
  "tasks": {
    "total": 45,
    "completed": 43,
    "failed": 2,
    "success_rate": 0.956
  },
  "performance": {
    "avg_task_duration_seconds": 15.3,
    "throughput_tasks_per_hour": 45,
    "quality_score": 0.92
  },
  "resources": {
    "cpu_percent": 65.2,
    "memory_mb": 256,
    "disk_io_mbps": 12.5
  },
  "collaboration": {
    "messages_sent": 450,
    "messages_received": 425,
    "collaborations": 28
  }
}
```

---

### /task orchestrate

Orchestrate a complex task across multiple agents.

**Syntax:**
```bash
/task orchestrate --task <task> [options]
```

**Arguments:**
- `--task <task>` - Task description
- `--agents <types>` - Required agent types (comma-separated)
- `--strategy <strategy>` - Orchestration strategy: sequential, parallel, pipeline (default: parallel)
- `--timeout <seconds>` - Task timeout (default: 3600)
- `--priority <level>` - Priority: low, normal, high, critical (default: normal)

**Example:**
```bash
/task orchestrate --task "Build authentication system" --agents "coder,tester,reviewer"
/task orchestrate --task "Analyze codebase" --agents "researcher,code-analyzer" --strategy sequential
/task orchestrate --task "Deploy application" --strategy pipeline --priority critical --timeout 1800
```

**Returns:**
```json
{
  "task_id": "task-xyz789",
  "description": "Build authentication system",
  "strategy": "parallel",
  "priority": "normal",
  "agents_assigned": [
    {"agent_id": "agent-1", "type": "coder", "subtask": "implement-auth"},
    {"agent_id": "agent-2", "type": "tester", "subtask": "test-auth"},
    {"agent_id": "agent-3", "type": "reviewer", "subtask": "review-auth"}
  ],
  "status": "in_progress",
  "created_at": "2024-01-20T10:40:00Z",
  "estimated_completion": "2024-01-20T11:00:00Z"
}
```

---

### /task status

Get status of orchestrated tasks.

**Syntax:**
```bash
/task status [options]
```

**Arguments:**
- `--task-id <id>` - Specific task ID
- `--status <status>` - Filter by status: pending, in_progress, completed, failed
- `--limit <n>` - Number of tasks to return (default: 10)

**Example:**
```bash
/task status
/task status --task-id task-xyz789
/task status --status in_progress --limit 5
```

**Returns:**
```json
{
  "tasks": [
    {
      "task_id": "task-xyz789",
      "description": "Build authentication system",
      "status": "in_progress",
      "progress": 0.65,
      "agents": 3,
      "started_at": "2024-01-20T10:40:00Z",
      "estimated_completion": "2024-01-20T11:00:00Z"
    },
    {
      "task_id": "task-abc123",
      "description": "Fix bug #456",
      "status": "completed",
      "progress": 1.0,
      "agents": 2,
      "started_at": "2024-01-20T10:30:00Z",
      "completed_at": "2024-01-20T10:45:00Z",
      "duration_seconds": 900
    }
  ],
  "total": 2
}
```

---

### /memory store

Store data in shared swarm memory.

**Syntax:**
```bash
/memory store --key <key> --value <value> [options]
```

**Arguments:**
- `--key <key>` - Memory key
- `--value <value>` - Value to store (string or JSON)
- `--namespace <ns>` - Namespace (default: global)
- `--ttl <seconds>` - Time-to-live (optional)

**Example:**
```bash
/memory store --key "api-endpoint" --value "https://api.example.com"
/memory store --key "swarm/config" --value '{"max_retries":3}' --namespace coordination
/memory store --key "temp-data" --value "cached-result" --ttl 3600
```

**Returns:**
```json
{
  "key": "api-endpoint",
  "namespace": "global",
  "stored": true,
  "expires_at": null
}
```

---

### /memory retrieve

Retrieve data from shared swarm memory.

**Syntax:**
```bash
/memory retrieve --key <key> [options]
```

**Arguments:**
- `--key <key>` - Memory key
- `--namespace <ns>` - Namespace (default: global)

**Example:**
```bash
/memory retrieve --key "api-endpoint"
/memory retrieve --key "swarm/config" --namespace coordination
```

**Returns:**
```json
{
  "key": "api-endpoint",
  "namespace": "global",
  "value": "https://api.example.com",
  "stored_at": "2024-01-20T10:30:00Z"
}
```

---

### /memory usage

Get memory usage statistics.

**Syntax:**
```bash
/memory usage [options]
```

**Arguments:**
- `--namespace <ns>` - Filter by namespace

**Example:**
```bash
/memory usage
/memory usage --namespace coordination
```

**Returns:**
```json
{
  "total_keys": 450,
  "total_size_bytes": 2097152,
  "namespaces": {
    "global": {
      "keys": 200,
      "size_bytes": 1048576
    },
    "coordination": {
      "keys": 150,
      "size_bytes": 786432
    },
    "cache": {
      "keys": 100,
      "size_bytes": 262144
    }
  },
  "hit_rate": 0.85,
  "miss_rate": 0.15,
  "evictions": 25
}
```

---

## Swarm Topologies

### Mesh
- All agents can communicate directly
- Maximum flexibility
- Higher coordination overhead

### Hierarchical
- Coordinator agents manage worker agents
- Clear chain of command
- Scalable to 100+ agents

### Hybrid
- Combines mesh and hierarchical
- Coordinators in mesh, workers hierarchical
- Best balance for large swarms

### Star
- Central coordinator
- Simple coordination
- Single point of failure

### Ring
- Agents in circular topology
- Pipeline processing
- Predictable message flow

---

## Agent Types

### Core Development
- `coder` - Code implementation
- `reviewer` - Code review
- `tester` - Test creation and execution
- `debugger` - Bug identification and fixing

### Analysis & Planning
- `researcher` - Information gathering
- `planner` - Task breakdown and planning
- `architect` - System design
- `code-analyzer` - Code analysis

### Specialized
- `backend-dev` - Backend development
- `frontend-dev` - Frontend development
- `ml-developer` - ML/AI development
- `cicd-engineer` - CI/CD and DevOps

### Coordination
- `coordinator` - Swarm coordination
- `orchestrator` - Task orchestration
- `monitor` - Performance monitoring

---

## Orchestration Strategies

### Sequential
- Tasks executed in order
- Each task waits for previous completion
- Use for: Dependencies, ordered workflows

### Parallel
- Tasks executed simultaneously
- Maximum concurrency
- Use for: Independent tasks, speed

### Pipeline
- Tasks flow through stages
- Output of one task feeds next
- Use for: Data processing, transformations

---

## Best Practices

### Swarm Initialization
1. Choose appropriate topology for task complexity
2. Enable memory for coordination-heavy workloads
3. Set realistic agent limits
4. Configure consensus for distributed tasks

### Agent Management
1. Spawn agents with specific capabilities
2. Monitor agent performance metrics
3. Scale based on workload
4. Use auto-assign for balanced distribution

### Task Orchestration
1. Break complex tasks into subtasks
2. Assign appropriate agent types
3. Set realistic timeouts
4. Use priorities for critical tasks

### Memory Coordination
1. Use namespaces to organize data
2. Set TTL for temporary data
3. Monitor memory usage
4. Clear unused keys regularly

---

## Common Options

- `--format <format>` - Output format: json, table (default: json)
- `--verbose, -v` - Verbose output with coordination details
- `--help, -h` - Show command help

## Notes

- Swarms support up to 100 concurrent agents
- Memory is shared across all agents in swarm
- Neural learning requires minimum 100 task completions
- Consensus ensures coordination in distributed environments
- Agent metrics updated every 30 seconds
- Failed tasks automatically retry up to 3 times
- Graceful scale down waits for task completion
