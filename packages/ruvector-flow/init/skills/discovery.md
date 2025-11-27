---
name: discovery
description: Service discovery for automatic cluster formation
tags: [discovery, service, cluster, gossip, multicast]
category: distributed
priority: P1
---

# Discovery Skill

## Overview

Master service discovery for automatic cluster formation and node management. Support static configuration, gossip protocol, and multicast discovery for flexible deployment scenarios.

## Available Operations

### 1. Static Discovery

```bash
# CLI
ruvector-flow discovery static --peers "node1:8080,node2:8080,node3:8080"

# MCP Tool
{
  "tool": "discovery_static",
  "peers": ["node1:8080", "node2:8080", "node3:8080"]
}
```

### 2. Gossip Discovery

```bash
# CLI
ruvector-flow discovery gossip --seed-nodes "seed1:8080,seed2:8080"

# MCP Tool
{
  "tool": "discovery_gossip",
  "seed_nodes": ["seed1:8080", "seed2:8080"]
}
```

### 3. Multicast Discovery

```bash
# CLI
ruvector-flow discovery multicast --group "239.255.0.1:8080"

# MCP Tool
{
  "tool": "discovery_multicast",
  "group": "239.255.0.1:8080"
}
```

### 4. Discovery Status

```bash
# CLI
ruvector-flow discovery status

# MCP Tool
{
  "tool": "discovery_status"
}
```

### 5. Node Registration

```bash
# CLI
ruvector-flow discovery register --node-id node1 --address "10.0.0.1:8080" --metadata '{"region":"us-east"}'

# MCP Tool
{
  "tool": "discovery_register",
  "node_id": "node1",
  "address": "10.0.0.1:8080",
  "metadata": {"region": "us-east"}
}
```

### 6. Node Unregister

```bash
# CLI
ruvector-flow discovery unregister --node-id node1

# MCP Tool
{
  "tool": "discovery_unregister",
  "node_id": "node1"
}
```

### 7. Heartbeat

```bash
# CLI
ruvector-flow discovery heartbeat --node-id node1

# MCP Tool
{
  "tool": "discovery_heartbeat",
  "node_id": "node1"
}
```

## Example Usage

### Static Discovery (Production)

```typescript
import { RuvectorFlow } from '@ruvector/flow';

// Fixed cluster topology
const db = new RuvectorFlow({
  discovery: {
    type: 'static',
    peers: [
      'node1.prod.internal:8080',
      'node2.prod.internal:8080',
      'node3.prod.internal:8080'
    ]
  }
});

await db.discovery.init();

// Nodes are immediately available
const peers = await db.discovery.getPeers();
console.log('Cluster nodes:', peers);
```

### Gossip Discovery (Dynamic)

```typescript
// Self-organizing cluster
const db = new RuvectorFlow({
  discovery: {
    type: 'gossip',
    seedNodes: ['seed1:8080', 'seed2:8080'],
    gossipInterval: 1000,      // Gossip every second
    suspicionTimeout: 5000,     // Mark as suspect after 5s
    failureTimeout: 10000       // Mark as failed after 10s
  }
});

await db.discovery.init();

// Wait for cluster to form
await db.discovery.waitForPeers(3);  // Wait for 3 nodes

// New nodes join automatically
const node4 = new RuvectorFlow({
  discovery: {
    type: 'gossip',
    seedNodes: ['seed1:8080']  // Only needs one seed
  }
});

await node4.discovery.init();
// Automatically discovers all peers via gossip
```

### Multicast Discovery (Local Network)

```typescript
// Auto-discovery on local network
const db = new RuvectorFlow({
  discovery: {
    type: 'multicast',
    multicastGroup: '239.255.0.1',
    multicastPort: 8080,
    interface: 'eth0'  // Network interface
  }
});

await db.discovery.init();

// Broadcast presence
await db.discovery.announce({
  nodeId: 'node1',
  address: 'node1:8080',
  metadata: {
    version: '1.0.0',
    capabilities: ['search', 'write']
  }
});

// Listen for peers
db.discovery.on('peer_discovered', (peer) => {
  console.log(`Discovered peer: ${peer.nodeId} at ${peer.address}`);
  console.log('Capabilities:', peer.metadata.capabilities);
});
```

### Health Monitoring

```typescript
// Automatic health checking
const db = new RuvectorFlow({
  discovery: {
    type: 'gossip',
    seedNodes: ['seed:8080'],
    healthCheck: {
      enabled: true,
      interval: 5000,       // Check every 5s
      timeout: 2000,        // 2s timeout
      retries: 3            // 3 retries before marking as failed
    }
  }
});

// Monitor node status changes
db.discovery.on('node_up', (nodeId) => {
  console.log(`Node ${nodeId} is now HEALTHY`);
  // Add back to routing
});

db.discovery.on('node_suspected', (nodeId) => {
  console.warn(`Node ${nodeId} is SUSPECTED (not responding)`);
  // Start draining traffic
});

db.discovery.on('node_down', (nodeId) => {
  console.error(`Node ${nodeId} is DOWN`);
  // Remove from routing
  // Trigger rebalancing
});
```

### Multi-Region Discovery

```typescript
// Discover nodes across regions
const db = new RuvectorFlow({
  discovery: {
    type: 'gossip',
    seedNodes: [
      'us-east-seed:8080',
      'eu-west-seed:8080',
      'ap-south-seed:8080'
    ],
    metadata: {
      region: process.env.REGION,
      zone: process.env.ZONE
    }
  }
});

// Filter peers by region
async function getRegionalPeers(region: string) {
  const allPeers = await db.discovery.getPeers();
  return allPeers.filter(p => p.metadata.region === region);
}

// Prefer same-region routing
async function regionalSearch(query: number[], userRegion: string) {
  const regionalPeers = await getRegionalPeers(userRegion);

  // Route to same-region node
  const targetNode = selectNode(regionalPeers);

  return targetNode.vector.search({
    collection: 'global',
    query,
    k: 10
  });
}
```

### Service Registry Pattern

```typescript
// Register service capabilities
class ServiceRegistry {
  private db: RuvectorFlow;

  async register(service: Service) {
    await this.db.discovery.register({
      nodeId: service.id,
      address: service.address,
      metadata: {
        type: service.type,
        capabilities: service.capabilities,
        version: service.version,
        load: await service.getLoad()
      }
    });

    // Update metadata periodically
    setInterval(async () => {
      await this.db.discovery.updateMetadata({
        nodeId: service.id,
        metadata: {
          load: await service.getLoad(),
          timestamp: Date.now()
        }
      });
    }, 10000);
  }

  async findService(type: string, capability?: string) {
    const peers = await this.db.discovery.getPeers();

    return peers.filter(p =>
      p.metadata.type === type &&
      (!capability || p.metadata.capabilities.includes(capability))
    );
  }

  async findLeastLoadedService(type: string) {
    const services = await this.findService(type);
    return services.reduce((min, s) =>
      s.metadata.load < min.metadata.load ? s : min
    );
  }
}

// Usage
const registry = new ServiceRegistry(db);

await registry.register({
  id: 'search-node-1',
  address: 'node1:8080',
  type: 'search',
  capabilities: ['vector-search', 'filter-search'],
  version: '1.0.0'
});

const searchNodes = await registry.findService('search', 'vector-search');
const bestNode = await registry.findLeastLoadedService('search');
```

### Automatic Node Registration

```typescript
// Auto-register on startup
async function startNode() {
  const nodeId = `node-${process.env.HOSTNAME}`;
  const address = `${process.env.NODE_IP}:8080`;

  const db = new RuvectorFlow({
    discovery: {
      type: 'gossip',
      seedNodes: process.env.SEED_NODES.split(','),
      autoRegister: true,  // Auto-register on init
      nodeId,
      address,
      metadata: {
        region: process.env.REGION,
        version: process.env.VERSION,
        startTime: Date.now()
      }
    }
  });

  await db.discovery.init();

  // Heartbeat automatically maintained
  // Deregisters on graceful shutdown
  process.on('SIGTERM', async () => {
    await db.discovery.unregister({ nodeId });
    await db.close();
  });
}
```

### DNS-Based Discovery

```typescript
// Discover via DNS SRV records
const db = new RuvectorFlow({
  discovery: {
    type: 'dns',
    domain: '_ruvector._tcp.cluster.local',
    interval: 30000  // Re-resolve every 30s
  }
});

// Discovers nodes from DNS SRV records:
// _ruvector._tcp.cluster.local. 60 IN SRV 10 60 8080 node1.cluster.local.
// _ruvector._tcp.cluster.local. 60 IN SRV 10 20 8080 node2.cluster.local.
// _ruvector._tcp.cluster.local. 60 IN SRV 10 20 8080 node3.cluster.local.
```

## Best Practices

### 1. Discovery Method Selection

| Method | Use Case | Pros | Cons |
|--------|----------|------|------|
| Static | Production, fixed topology | Simple, reliable | Manual updates |
| Gossip | Dynamic clusters | Auto-discovery | More complex |
| Multicast | Local networks | Zero config | Limited to LAN |
| DNS | Kubernetes/Cloud | Platform integration | Depends on DNS |

### 2. Seed Node Strategy
```typescript
// Use multiple seed nodes for reliability
const seedNodes = [
  'seed1.cluster.local:8080',  // Primary seed
  'seed2.cluster.local:8080',  // Backup seed
  'seed3.cluster.local:8080'   // Additional seed
];

// At least 2-3 seeds for high availability
const db = new RuvectorFlow({
  discovery: {
    type: 'gossip',
    seedNodes,
    minSeedNodes: 2  // Require 2 seeds to be reachable
  }
});
```

### 3. Metadata Best Practices
```typescript
// Keep metadata small and relevant
interface NodeMetadata {
  // Essential info
  region: string;
  zone: string;
  version: string;

  // Dynamic info
  load: number;
  capacity: number;
  lastUpdate: number;

  // Capabilities
  features: string[];
  roles: string[];
}

// Avoid:
// - Large objects
// - Binary data
// - Frequently changing data (use separate channel)
```

### 4. Failure Detection Tuning
```typescript
// Production settings
const db = new RuvectorFlow({
  discovery: {
    type: 'gossip',
    seedNodes: ['seed:8080'],
    suspicionMultiplier: 4,    // Conservative
    failureTimeout: 20000,     // 20s timeout
    heartbeatInterval: 2000    // Heartbeat every 2s
  }
});

// Fast failure detection (dev/test)
const devDb = new RuvectorFlow({
  discovery: {
    type: 'gossip',
    seedNodes: ['localhost:8080'],
    suspicionMultiplier: 2,    // Aggressive
    failureTimeout: 5000,      // 5s timeout
    heartbeatInterval: 1000    // Heartbeat every 1s
  }
});
```

### 5. Network Partitions
```typescript
// Handle split-brain scenarios
db.discovery.on('partition_detected', async (partition) => {
  console.error('Network partition detected:');
  console.error('  Reachable nodes:', partition.reachable);
  console.error('  Unreachable nodes:', partition.unreachable);

  // Determine majority partition
  const isMajority = partition.reachable.length > partition.unreachable.length;

  if (!isMajority) {
    console.error('This node is in minority partition');
    // Stop accepting writes
    await db.setReadOnly(true);
  }
});
```

## Monitoring

```typescript
// Discovery health dashboard
async function monitorDiscovery() {
  const status = await db.discovery.status();

  console.log(`
=== Discovery Status ===
Type: ${status.type}
Total Peers: ${status.peerCount}
Healthy Peers: ${status.healthyPeers}
Suspected Peers: ${status.suspectedPeers}
Failed Peers: ${status.failedPeers}

=== Peer Details ===
${status.peers.map(p => `
  ${p.nodeId} (${p.address})
    Status: ${p.status}
    Last Seen: ${new Date(p.lastSeen).toISOString()}
    Region: ${p.metadata.region}
    Load: ${p.metadata.load}%
`).join('')}

=== Gossip Stats ===
Messages Sent: ${status.gossip.messagesSent}
Messages Received: ${status.gossip.messagesReceived}
Round-trip Time: ${status.gossip.avgRttMs}ms
  `);
}

setInterval(monitorDiscovery, 30000);
```

## Troubleshooting

### Nodes Not Discovering
- Verify network connectivity
- Check firewall rules
- Ensure seed nodes are correct
- Check multicast group configuration

### Frequent False Positives
- Increase suspicion timeout
- Reduce network latency
- Check node resource usage
- Tune heartbeat interval

### Slow Convergence
- Increase gossip fanout
- Reduce gossip interval
- Add more seed nodes
- Check network bandwidth

### Memory Growth
- Enable peer pruning
- Limit metadata size
- Reduce peer history
- Configure max peers limit

## Related Skills
- `cluster-management` - Using discovered nodes
- `consensus` - Coordination among discovered nodes
- `metrics` - Monitoring discovery health
- `server` - Exposing discovery endpoints
