---
name: cluster-management
description: Distributed cluster operations with sharding and replication
tags: [cluster, distributed, sharding, replication, scalability]
category: distributed
priority: P1
---

# Cluster Management Skill

## Overview

Master distributed cluster operations for horizontal scalability, high availability, and fault tolerance. Manage nodes, shards, and replication across a distributed vector database cluster.

## Available Operations

### 1. Cluster Initialization

```bash
# CLI
ruvector-flow cluster init --node-id node1 --listen "0.0.0.0:8080" --shards 16

# MCP Tool
{
  "tool": "cluster_init",
  "node_id": "node1",
  "listen": "0.0.0.0:8080",
  "shards": 16
}
```

### 2. Node Management

```bash
# Add node
ruvector-flow cluster node add --node-id node2 --address "10.0.0.2:8080"

# Remove node
ruvector-flow cluster node remove --node-id node2

# List nodes
ruvector-flow cluster node list
```

### 3. Shard Management

```bash
# List shards
ruvector-flow cluster shard list

# Rebalance shards
ruvector-flow cluster shard rebalance

# Shard stats
ruvector-flow cluster shard stats
```

### 4. Cluster Status

```bash
# Overall stats
ruvector-flow cluster stats

# Health check
ruvector-flow cluster health

# Hash ring info
ruvector-flow cluster ring info

# Leader election status
ruvector-flow cluster leader
```

## Example Usage

### 3-Node Cluster Setup

```typescript
import { RuvectorFlow } from '@ruvector/flow';

// Node 1 (10.0.0.1)
const node1 = new RuvectorFlow({
  cluster: {
    nodeId: 'node1',
    listen: '0.0.0.0:8080',
    peers: [],
    shards: 16,
    replicationFactor: 2
  }
});

await node1.cluster.init();

// Node 2 (10.0.0.2)
const node2 = new RuvectorFlow({
  cluster: {
    nodeId: 'node2',
    listen: '0.0.0.0:8080',
    peers: ['10.0.0.1:8080'],
    shards: 16,
    replicationFactor: 2
  }
});

await node2.cluster.join();

// Node 3 (10.0.0.3)
const node3 = new RuvectorFlow({
  cluster: {
    nodeId: 'node3',
    listen: '0.0.0.0:8080',
    peers: ['10.0.0.1:8080', '10.0.0.2:8080'],
    shards: 16,
    replicationFactor: 2
  }
});

await node3.cluster.join();

// Wait for cluster to stabilize
await node1.cluster.waitForHealthy();
```

### Automatic Sharding

```typescript
// Insert vectors - automatically sharded
const db = new RuvectorFlow({
  cluster: {
    nodeId: 'node1',
    peers: ['node2:8080', 'node3:8080']
  }
});

// Inserts are automatically distributed across shards
for (let i = 0; i < 1000000; i++) {
  await db.vector.insert({
    collection: 'distributed',
    id: `vec_${i}`,
    vector: generateVector(),
    metadata: { index: i }
  });
  // Routing happens automatically based on hash(id)
}

// Verify distribution
const stats = await db.cluster.stats();
console.log('Vectors per node:', stats.nodes.map(n => ({
  id: n.id,
  vectors: n.vectorCount
})));
```

### Shard Rebalancing

```typescript
// Monitor shard balance
const checkBalance = async () => {
  const shards = await db.cluster.shardList();

  const distribution = shards.map(s => ({
    shard: s.id,
    node: s.nodeId,
    vectors: s.vectorCount,
    memory: s.memoryMB
  }));

  console.table(distribution);

  // Check if imbalanced
  const vectorCounts = shards.map(s => s.vectorCount);
  const avg = vectorCounts.reduce((a, b) => a + b) / vectorCounts.length;
  const maxImbalance = Math.max(...vectorCounts.map(c => Math.abs(c - avg))) / avg;

  if (maxImbalance > 0.2) {  // >20% imbalance
    console.log('Cluster imbalanced, triggering rebalance...');
    await db.cluster.rebalance();
  }
};

// Run periodically
setInterval(checkBalance, 60000);  // Every minute
```

### High Availability with Replication

```typescript
// Setup with replication factor 3
const db = new RuvectorFlow({
  cluster: {
    nodeId: 'node1',
    peers: ['node2:8080', 'node3:8080', 'node4:8080'],
    replicationFactor: 3  // Each shard replicated 3 times
  }
});

// Insert with replication
await db.vector.insert({
  collection: 'replicated',
  id: 'important_doc',
  vector: embedding,
  metadata: { critical: true }
});
// Vector is now stored on 3 different nodes

// Read still works even if nodes fail
await db.cluster.nodeRemove({ nodeId: 'node2' });  // Simulate failure
const result = await db.vector.get({
  collection: 'replicated',
  id: 'important_doc'
});
// Successfully retrieved from replica
```

### Dynamic Scaling

```typescript
// Add node to running cluster
async function scaleOut(newNodeAddress: string) {
  await db.cluster.nodeAdd({
    nodeId: `node_${Date.now()}`,
    address: newNodeAddress
  });

  // Trigger rebalance
  await db.cluster.rebalance();

  // Wait for rebalance to complete
  await db.cluster.waitForHealthy();

  console.log('Scale out complete');
}

// Remove node gracefully
async function scaleIn(nodeId: string) {
  // Move shards off node first
  const shards = await db.cluster.shardList();
  const nodeShards = shards.filter(s => s.nodeId === nodeId);

  for (const shard of nodeShards) {
    await db.cluster.shardMove({
      shardId: shard.id,
      targetNode: findLeastLoadedNode()
    });
  }

  // Wait for migration
  await db.cluster.waitForHealthy();

  // Remove node
  await db.cluster.nodeRemove({ nodeId });

  console.log('Scale in complete');
}
```

### Multi-Region Setup

```typescript
// Region 1: US-East
const usEastCluster = new RuvectorFlow({
  cluster: {
    region: 'us-east',
    nodes: [
      { id: 'us-east-1', address: 'us-east-1.internal:8080' },
      { id: 'us-east-2', address: 'us-east-2.internal:8080' },
      { id: 'us-east-3', address: 'us-east-3.internal:8080' }
    ],
    replicationFactor: 2
  }
});

// Region 2: EU-West
const euWestCluster = new RuvectorFlow({
  cluster: {
    region: 'eu-west',
    nodes: [
      { id: 'eu-west-1', address: 'eu-west-1.internal:8080' },
      { id: 'eu-west-2', address: 'eu-west-2.internal:8080' }
    ],
    replicationFactor: 2
  }
});

// Route to closest region
async function search(userRegion: string, query: number[]) {
  const cluster = userRegion.startsWith('us') ? usEastCluster : euWestCluster;
  return cluster.vector.search({
    collection: 'global',
    query,
    k: 10
  });
}
```

### Cluster Monitoring

```typescript
// Comprehensive cluster monitoring
async function monitorCluster() {
  const stats = await db.cluster.stats();
  const health = await db.cluster.health();

  console.log(`
=== Cluster Status ===
Nodes: ${stats.nodeCount} (${health.healthyNodes}/${stats.nodeCount} healthy)
Total Vectors: ${stats.totalVectors}
Total Memory: ${stats.totalMemoryGB}GB
Shards: ${stats.shardCount}
Replication Factor: ${stats.replicationFactor}

=== Node Details ===
${stats.nodes.map(node => `
  ${node.id}: ${node.status}
    Vectors: ${node.vectorCount}
    Memory: ${node.memoryGB}GB
    Shards: ${node.shardCount}
    CPU: ${node.cpuPercent}%
    Network: ${node.networkMbps}Mbps
`).join('')}

=== Shard Distribution ===
${stats.shards.map(shard => `
  Shard ${shard.id}: ${shard.vectorCount} vectors on ${shard.nodeId}
`).join('')}
  `);

  // Alert if unhealthy
  if (health.healthyNodes < stats.nodeCount) {
    sendAlert('Cluster degraded', health);
  }
}

setInterval(monitorCluster, 30000);  // Every 30s
```

## Best Practices

### 1. Cluster Sizing

| Scale | Nodes | Shards | Replication | Use Case |
|-------|-------|--------|-------------|----------|
| Small | 1-3 | 4-8 | 1-2 | Dev/Testing |
| Medium | 3-6 | 16-32 | 2-3 | Production |
| Large | 6-12 | 32-64 | 3 | High-scale |
| XLarge | 12+ | 64-128 | 3 | Enterprise |

### 2. Shard Count Selection
```typescript
// Rule of thumb: shards = nodes * cores * 2
const optimalShards = nodeCount * coresPerNode * 2;

// But limit based on data size
const vectorsPerShard = totalVectors / optimalShards;
if (vectorsPerShard < 100000) {
  // Too many shards, reduce count
  optimalShards = Math.ceil(totalVectors / 100000);
}
```

### 3. Replication Strategy
- **Replication Factor 1**: No redundancy (dev only)
- **Replication Factor 2**: Tolerates 1 node failure
- **Replication Factor 3**: Tolerates 2 node failures (recommended)
- **Replication Factor >3**: Diminishing returns

### 4. Node Failure Handling
```typescript
// Monitor node health
db.cluster.on('node_failure', async (nodeId) => {
  console.error(`Node ${nodeId} failed`);

  // Wait for automatic failover
  await db.cluster.waitForHealthy();

  // If node doesn't recover, remove it
  setTimeout(async () => {
    const health = await db.cluster.health();
    if (!health.nodes[nodeId]) {
      await db.cluster.nodeRemove({ nodeId });
      await scaleOut(getNewNodeAddress());  // Replace failed node
    }
  }, 300000);  // 5 minutes
});
```

### 5. Network Optimization
```typescript
// Use dedicated network for cluster communication
const db = new RuvectorFlow({
  cluster: {
    nodeId: 'node1',
    listen: '0.0.0.0:8080',        // Public interface
    clusterListen: '0.0.0.0:8081',  // Internal cluster network
    peers: [
      'node2.internal:8081',
      'node3.internal:8081'
    ]
  }
});
```

### 6. Gradual Rollout
```typescript
// Rolling update without downtime
async function rollingUpdate() {
  const nodes = await db.cluster.nodeList();

  for (const node of nodes) {
    // Update one node at a time
    console.log(`Updating ${node.id}...`);

    // Drain node
    await db.cluster.nodeDrain({ nodeId: node.id });

    // Update node (restart with new version)
    await updateNode(node.id);

    // Wait for node to rejoin
    await db.cluster.waitForNode({ nodeId: node.id });

    // Wait for cluster to stabilize
    await db.cluster.waitForHealthy();

    console.log(`${node.id} updated successfully`);
  }
}
```

## Performance Tuning

### Consistent Hashing
```typescript
// Hash ring provides even distribution
const ring = await db.cluster.ringInfo();
console.log(`
Virtual nodes per physical node: ${ring.virtualNodes}
Total ring slots: ${ring.totalSlots}
Distribution variance: ${ring.variance}
`);

// Increase virtual nodes for better balance
await db.cluster.ringConfigure({
  virtualNodesPerNode: 256  // Default: 128
});
```

### Load Balancing
```typescript
// Client-side load balancing
class LoadBalancedClient {
  private nodes: RuvectorFlow[];
  private currentIndex = 0;

  async search(params: SearchParams) {
    // Round-robin across nodes
    const node = this.nodes[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.nodes.length;

    return node.vector.search(params);
  }
}
```

## Troubleshooting

### Split Brain
- Ensure odd number of nodes for consensus
- Configure proper network timeouts
- Use proper quorum settings

### Slow Rebalancing
- Reduce rebalance parallelism
- Increase batch size
- Check network bandwidth

### Uneven Distribution
- Check hash ring configuration
- Verify shard count is appropriate
- Increase virtual nodes

## Related Skills
- `consensus` - DAG consensus for coordination
- `discovery` - Service discovery for nodes
- `storage` - Distributed storage
- `metrics` - Cluster monitoring
