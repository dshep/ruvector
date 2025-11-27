---
name: consensus
description: DAG consensus operations for distributed coordination
tags: [consensus, dag, distributed, coordination, ordering]
category: distributed
priority: P1
---

# Consensus Skill

## Overview

Master DAG (Directed Acyclic Graph) based consensus for distributed coordination in vector database clusters. Achieve conflict-free distributed writes with causal ordering and eventual consistency.

## Available Operations

### 1. Submit Transaction

```bash
# CLI
ruvector-flow consensus submit --operation insert --data '{"id":"vec1","vector":[0.1,0.2]}'

# MCP Tool
{
  "tool": "consensus_submit",
  "operation": "insert",
  "data": {
    "id": "vec1",
    "vector": [0.1, 0.2]
  }
}
```

### 2. Finalize Vertices

```bash
# CLI
ruvector-flow consensus finalize --vertex-id vertex123

# MCP Tool
{
  "tool": "consensus_finalize",
  "vertex_id": "vertex123"
}
```

### 3. Get Order

```bash
# CLI
ruvector-flow consensus order --from-vertex vertex100 --to-vertex vertex200

# MCP Tool
{
  "tool": "consensus_order",
  "from_vertex": "vertex100",
  "to_vertex": "vertex200"
}
```

### 4. Consensus Stats

```bash
# CLI
ruvector-flow consensus stats

# MCP Tool
{
  "tool": "consensus_stats"
}
```

### 5. Prune Vertices

```bash
# CLI
ruvector-flow consensus prune --before-timestamp 1609459200

# MCP Tool
{
  "tool": "consensus_prune",
  "before_timestamp": 1609459200
}
```

### 6. Detect Conflicts

```bash
# CLI
ruvector-flow consensus conflicts --vertex-id vertex123

# MCP Tool
{
  "tool": "consensus_conflicts",
  "vertex_id": "vertex123"
}
```

### 7. Vector Clock Info

```bash
# CLI
ruvector-flow consensus clock --node-id node1

# MCP Tool
{
  "tool": "consensus_clock",
  "node_id": "node1"
}
```

## Example Usage

### Distributed Write Coordination

```typescript
import { RuvectorFlow } from '@ruvector/flow';

const db = new RuvectorFlow({
  cluster: {
    nodeId: 'node1',
    peers: ['node2:8080', 'node3:8080'],
    consensus: {
      type: 'dag',
      enabled: true
    }
  }
});

// Submit concurrent writes from different nodes
// Node 1
await db.consensus.submit({
  operation: 'insert',
  data: {
    collection: 'docs',
    id: 'doc1',
    vector: [0.1, 0.2, 0.3],
    metadata: { source: 'node1' }
  }
});

// Node 2 (concurrent)
await db.consensus.submit({
  operation: 'update',
  data: {
    collection: 'docs',
    id: 'doc1',
    metadata: { views: 10 }
  }
});

// DAG consensus ensures causal ordering
const order = await db.consensus.getOrder();
console.log('Causally ordered operations:', order);
```

### Conflict Resolution

```typescript
// Handle concurrent updates
db.consensus.on('conflict', async (conflict) => {
  console.log(`Conflict detected:
    Vertex1: ${conflict.vertex1.id}
    Vertex2: ${conflict.vertex2.id}
    Operation: ${conflict.operation}
  `);

  // Application-specific resolution
  const resolved = await resolveConflict(conflict);

  await db.consensus.submit({
    operation: 'resolve',
    data: resolved,
    resolves: [conflict.vertex1.id, conflict.vertex2.id]
  });
});

// Example: Last-write-wins resolution
async function resolveConflict(conflict: Conflict) {
  const v1Time = conflict.vertex1.vectorClock.timestamp;
  const v2Time = conflict.vertex2.vectorClock.timestamp;

  // Use latest write
  return v1Time > v2Time ? conflict.vertex1.data : conflict.vertex2.data;
}
```

### Causal Ordering Guarantees

```typescript
// Ensure operations are applied in causal order
class CausalDatabase {
  private db: RuvectorFlow;
  private pendingOps: Map<string, Operation[]> = new Map();

  async insert(id: string, vector: number[], deps: string[] = []) {
    const vertex = await this.db.consensus.submit({
      operation: 'insert',
      data: { id, vector },
      dependencies: deps  // Explicit causal dependencies
    });

    // Wait for all dependencies to be finalized
    await this.waitForDeps(deps);

    // Apply operation
    await this.db.vector.insert({ id, vector });

    return vertex.id;
  }

  private async waitForDeps(deps: string[]) {
    for (const depId of deps) {
      await this.db.consensus.waitForFinalized(depId);
    }
  }
}

// Usage
const causalDb = new CausalDatabase(db);

// op1 -> op2 -> op3 (enforced causal chain)
const v1 = await causalDb.insert('doc1', [0.1, 0.2]);
const v2 = await causalDb.insert('doc2', [0.3, 0.4], [v1]);  // Depends on v1
const v3 = await causalDb.insert('doc3', [0.5, 0.6], [v2]);  // Depends on v2
```

### DAG Visualization

```typescript
// Inspect consensus DAG structure
async function visualizeDAG() {
  const stats = await db.consensus.stats();

  console.log(`
=== DAG Consensus Stats ===
Total Vertices: ${stats.totalVertices}
Finalized Vertices: ${stats.finalizedVertices}
Pending Vertices: ${stats.pendingVertices}
DAG Depth: ${stats.maxDepth}
Branches: ${stats.branchCount}

=== Vector Clocks ===
${stats.nodes.map(node => `
  ${node.id}: [${Object.entries(node.vectorClock).map(([k, v]) => `${k}:${v}`).join(', ')}]
`).join('')}
  `);

  // Export DAG for visualization
  const dag = await db.consensus.exportDAG();
  await writeDOTFile('consensus.dot', dag);
}
```

### Garbage Collection

```typescript
// Prune finalized vertices periodically
async function pruneConsensusHistory() {
  const stats = await db.consensus.stats();

  // Keep last 24 hours of history
  const pruneBeforeTimestamp = Date.now() - (24 * 60 * 60 * 1000);

  const pruned = await db.consensus.prune({
    beforeTimestamp: pruneBeforeTimestamp,
    keepFinalized: true  // Keep finalized vertices longer
  });

  console.log(`Pruned ${pruned.count} vertices, freed ${pruned.memoryMB}MB`);
}

// Run daily
setInterval(pruneConsensusHistory, 24 * 60 * 60 * 1000);
```

### Multi-Leader Replication

```typescript
// Enable writes on all nodes
const node1 = new RuvectorFlow({
  cluster: {
    nodeId: 'node1',
    role: 'leader',
    consensus: { type: 'dag', enabled: true }
  }
});

const node2 = new RuvectorFlow({
  cluster: {
    nodeId: 'node2',
    role: 'leader',  // Also a leader
    consensus: { type: 'dag', enabled: true }
  }
});

// Both nodes can accept writes concurrently
await node1.vector.insert({ id: 'doc1', vector: [0.1, 0.2] });
await node2.vector.insert({ id: 'doc2', vector: [0.3, 0.4] });

// Consensus ensures eventual consistency
await node1.consensus.waitForConvergence();
await node2.consensus.waitForConvergence();

// Both nodes now have both documents
assert((await node1.vector.count()) === 2);
assert((await node2.vector.count()) === 2);
```

### Session Guarantees

```typescript
// Implement read-your-writes consistency
class SessionDB {
  private db: RuvectorFlow;
  private sessionClock: VectorClock = {};

  async write(id: string, vector: number[]) {
    const vertex = await this.db.consensus.submit({
      operation: 'insert',
      data: { id, vector }
    });

    // Update session clock
    this.sessionClock = this.mergeClocks(
      this.sessionClock,
      vertex.vectorClock
    );

    return vertex.id;
  }

  async read(id: string) {
    // Wait for session clock to be satisfied
    await this.db.consensus.waitForClock(this.sessionClock);

    // Now safe to read
    return this.db.vector.get({ id });
  }

  private mergeClocks(c1: VectorClock, c2: VectorClock): VectorClock {
    const merged = { ...c1 };
    for (const [node, time] of Object.entries(c2)) {
      merged[node] = Math.max(merged[node] || 0, time);
    }
    return merged;
  }
}
```

## Best Practices

### 1. Dependency Management
```typescript
// Explicit dependencies for causal relationships
await db.consensus.submit({
  operation: 'update',
  data: updateData,
  dependencies: [previousUpdateVertexId]  // Explicit causality
});

// Implicit dependencies via vector clocks
// (handled automatically)
```

### 2. Conflict Detection Strategies

| Strategy | Use Case | Complexity |
|----------|----------|------------|
| Last-Write-Wins | Simple apps | Low |
| Application-specific | Business logic | Medium |
| CRDT merging | Collaborative editing | High |
| Manual resolution | Critical data | High |

### 3. Performance Tuning
```typescript
// Batch submissions for better throughput
const operations = [];
for (let i = 0; i < 1000; i++) {
  operations.push({
    operation: 'insert',
    data: { id: `doc${i}`, vector: generateVector() }
  });
}

await db.consensus.submitBatch(operations);

// vs individual submissions (slower)
for (const op of operations) {
  await db.consensus.submit(op);
}
```

### 4. Monitoring Consensus Health
```typescript
async function checkConsensusHealth() {
  const stats = await db.consensus.stats();

  // Check for issues
  if (stats.pendingVertices > 10000) {
    console.warn('High number of pending vertices, check network');
  }

  if (stats.conflictRate > 0.01) {
    console.warn('High conflict rate, review write patterns');
  }

  if (stats.avgFinalizationTime > 1000) {
    console.warn('Slow finalization, check node performance');
  }

  return stats;
}
```

### 5. Pruning Strategy
```typescript
// Aggressive pruning for high-write workloads
await db.consensus.configure({
  pruneInterval: 60000,        // Prune every minute
  retentionPeriod: 3600000,    // Keep 1 hour of history
  maxVertices: 100000          // Max vertices in DAG
});

// Conservative pruning for audit trails
await db.consensus.configure({
  pruneInterval: 86400000,     // Prune daily
  retentionPeriod: 2592000000, // Keep 30 days
  maxVertices: 1000000         // Larger DAG
});
```

## Consensus Algorithms

### DAG vs Raft

| Feature | DAG Consensus | Raft |
|---------|---------------|------|
| Write throughput | High (parallel) | Medium (sequential) |
| Conflict handling | Automatic | None (single leader) |
| Latency | Low | Medium |
| Complexity | High | Low |
| Use case | Multi-leader | Single-leader |

### Vector Clock Operations
```typescript
// Compare vector clocks
function compareClock(c1: VectorClock, c2: VectorClock): Order {
  let c1Greater = false;
  let c2Greater = false;

  const allNodes = new Set([...Object.keys(c1), ...Object.keys(c2)]);

  for (const node of allNodes) {
    const t1 = c1[node] || 0;
    const t2 = c2[node] || 0;

    if (t1 > t2) c1Greater = true;
    if (t2 > t1) c2Greater = true;
  }

  if (c1Greater && !c2Greater) return 'c1_after_c2';
  if (c2Greater && !c1Greater) return 'c2_after_c1';
  if (!c1Greater && !c2Greater) return 'equal';
  return 'concurrent';  // Conflict!
}
```

## Troubleshooting

### High Pending Vertices
- Increase finalization parallelism
- Check network connectivity
- Reduce write rate temporarily
- Increase pruning frequency

### Frequent Conflicts
- Review write patterns
- Add explicit dependencies
- Use application-level locking
- Consider CRDT data structures

### Slow Finalization
- Check CPU usage on nodes
- Reduce DAG depth with pruning
- Increase network bandwidth
- Optimize conflict resolution

### Memory Growth
- Enable aggressive pruning
- Reduce retention period
- Export and archive old DAG
- Increase finalization rate

## Related Skills
- `cluster-management` - Distributed cluster setup
- `discovery` - Node discovery for consensus
- `storage` - Persisting consensus state
- `metrics` - Monitoring consensus health
