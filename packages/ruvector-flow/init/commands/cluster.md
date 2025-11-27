# Cluster Management Commands

Distributed cluster operations for scaling RuVector horizontally.

## Commands

### /cluster init

Initialize a new cluster.

**Syntax:**
```bash
/cluster init --nodes <nodes> [options]
```

**Arguments:**
- `--nodes <nodes>` - Number of initial nodes (default: 1)
- `--replication <n>` - Replication factor (default: 3)
- `--shards <n>` - Number of shards (default: auto)
- `--name <name>` - Cluster name (default: ruvector-cluster)
- `--bind <addr>` - Bind address (default: 0.0.0.0:6333)

**Example:**
```bash
/cluster init --nodes 3 --replication 3
/cluster init --nodes 5 --shards 10 --name production-cluster
```

**Returns:**
```json
{
  "cluster": "production-cluster",
  "nodes": 5,
  "replication_factor": 3,
  "shards": 10,
  "status": "initialized",
  "leader": "node-1"
}
```

---

### /cluster node add

Add a new node to the cluster.

**Syntax:**
```bash
/cluster node add --address <addr> [options]
```

**Arguments:**
- `--address <addr>` - Node address (host:port)
- `--role <role>` - Node role: primary, replica, coordinator (default: primary)
- `--capacity <n>` - Storage capacity in GB (optional)

**Example:**
```bash
/cluster node add --address 192.168.1.10:6333
/cluster node add --address node-4:6333 --role replica
/cluster node add --address 10.0.0.5:6333 --role coordinator --capacity 500
```

**Returns:**
```json
{
  "node_id": "node-4",
  "address": "192.168.1.10:6333",
  "role": "primary",
  "status": "joining",
  "rebalancing": true
}
```

---

### /cluster node remove

Remove a node from the cluster.

**Syntax:**
```bash
/cluster node remove --node <id> [options]
```

**Arguments:**
- `--node <id>` - Node ID
- `--graceful` - Graceful shutdown (migrate data first)
- `--force` - Force removal (skip data migration)

**Example:**
```bash
/cluster node remove --node node-3 --graceful
/cluster node remove --node node-5 --force
```

**Returns:**
```json
{
  "node_id": "node-3",
  "status": "removing",
  "data_migrated": 50000,
  "estimated_time_seconds": 120
}
```

---

### /cluster node list

List all nodes in the cluster.

**Syntax:**
```bash
/cluster node list [options]
```

**Arguments:**
- `--format <format>` - Output format: json, table (default: table)
- `--detailed` - Include detailed node statistics

**Example:**
```bash
/cluster node list
/cluster node list --format json --detailed
```

**Returns:**
```json
{
  "nodes": [
    {
      "id": "node-1",
      "address": "192.168.1.10:6333",
      "role": "primary",
      "status": "healthy",
      "shards": 3,
      "vectors": 50000,
      "cpu_usage": 45.2,
      "memory_usage_bytes": 2147483648
    },
    {
      "id": "node-2",
      "address": "192.168.1.11:6333",
      "role": "replica",
      "status": "healthy",
      "shards": 3,
      "vectors": 50000,
      "cpu_usage": 38.7,
      "memory_usage_bytes": 2147483648
    }
  ],
  "total": 2
}
```

---

### /cluster shard list

List all shards in the cluster.

**Syntax:**
```bash
/cluster shard list [options]
```

**Arguments:**
- `--collection <name>` - Filter by collection
- `--node <id>` - Filter by node

**Example:**
```bash
/cluster shard list
/cluster shard list --collection products
/cluster shard list --node node-1
```

**Returns:**
```json
{
  "shards": [
    {
      "id": "shard-0",
      "collection": "products",
      "node": "node-1",
      "vectors": 25000,
      "replicas": ["node-2", "node-3"],
      "status": "active"
    },
    {
      "id": "shard-1",
      "collection": "products",
      "node": "node-2",
      "vectors": 25000,
      "replicas": ["node-1", "node-3"],
      "status": "active"
    }
  ],
  "total": 2
}
```

---

### /cluster shard rebalance

Rebalance shards across nodes.

**Syntax:**
```bash
/cluster shard rebalance [options]
```

**Arguments:**
- `--collection <name>` - Rebalance specific collection (optional)
- `--strategy <strategy>` - Rebalancing strategy: uniform, capacity, load (default: uniform)
- `--dry-run` - Show rebalancing plan without executing

**Example:**
```bash
/cluster shard rebalance --strategy uniform
/cluster shard rebalance --collection products --strategy capacity
/cluster shard rebalance --dry-run
```

**Returns:**
```json
{
  "status": "rebalancing",
  "moves": [
    {
      "shard": "shard-2",
      "from": "node-1",
      "to": "node-3",
      "vectors": 30000
    }
  ],
  "estimated_time_seconds": 180,
  "strategy": "uniform"
}
```

---

### /cluster stats

Get cluster-wide statistics.

**Syntax:**
```bash
/cluster stats
```

**Example:**
```bash
/cluster stats
```

**Returns:**
```json
{
  "cluster": "production-cluster",
  "nodes": 3,
  "shards": 6,
  "collections": 5,
  "total_vectors": 500000,
  "total_size_bytes": 10737418240,
  "replication_factor": 3,
  "availability": "99.99%",
  "performance": {
    "avg_insert_latency_ms": 2.5,
    "avg_search_latency_ms": 8.3,
    "qps": 1200,
    "throughput_mbps": 150
  },
  "health": "healthy"
}
```

---

### /cluster health

Check cluster health status.

**Syntax:**
```bash
/cluster health [options]
```

**Arguments:**
- `--detailed` - Include per-node health details

**Example:**
```bash
/cluster health
/cluster health --detailed
```

**Returns:**
```json
{
  "status": "healthy",
  "nodes_total": 3,
  "nodes_healthy": 3,
  "nodes_unhealthy": 0,
  "shards_active": 6,
  "shards_inactive": 0,
  "replication_ok": true,
  "consensus_ok": true,
  "issues": []
}
```

**Detailed Response:**
```json
{
  "status": "degraded",
  "nodes": [
    {
      "id": "node-1",
      "status": "healthy",
      "latency_ms": 1.2,
      "last_heartbeat": "2024-01-20T10:30:45Z"
    },
    {
      "id": "node-2",
      "status": "unhealthy",
      "latency_ms": 5000,
      "last_heartbeat": "2024-01-20T10:25:00Z",
      "issue": "High latency detected"
    }
  ],
  "issues": [
    "Node node-2 has high latency (5000ms)",
    "Shard shard-3 has only 2/3 replicas"
  ]
}
```

---

### /cluster ring info

Get consistent hash ring information.

**Syntax:**
```bash
/cluster ring info
```

**Example:**
```bash
/cluster ring info
```

**Returns:**
```json
{
  "ring": {
    "nodes": ["node-1", "node-2", "node-3"],
    "virtual_nodes": 150,
    "hash_function": "xxhash64",
    "partitions": [
      {
        "range": "0x0000000000000000-0x5555555555555555",
        "node": "node-1",
        "vectors": 166667
      },
      {
        "range": "0x5555555555555556-0xAAAAAAAAAAAAAAAA",
        "node": "node-2",
        "vectors": 166666
      },
      {
        "range": "0xAAAAAAAAAAAAAAAB-0xFFFFFFFFFFFFFFFF",
        "node": "node-3",
        "vectors": 166667
      }
    ]
  }
}
```

---

### /cluster leader

Get or elect cluster leader.

**Syntax:**
```bash
/cluster leader [options]
```

**Arguments:**
- `--elect <node>` - Force leader election to specific node
- `--auto` - Trigger automatic leader election

**Example:**
```bash
/cluster leader
/cluster leader --elect node-2
/cluster leader --auto
```

**Returns:**
```json
{
  "leader": "node-1",
  "term": 5,
  "elected_at": "2024-01-20T08:00:00Z",
  "followers": ["node-2", "node-3"]
}
```

---

## Cluster Architecture

### Consistent Hashing
- Hash ring with virtual nodes for even distribution
- Automatic rebalancing on node addition/removal
- Minimal data movement during rebalancing

### Replication
- Configurable replication factor (default: 3)
- Automatic replica placement for fault tolerance
- Synchronous or asynchronous replication

### Sharding
- Automatic or manual shard distribution
- Shard-level replication
- Dynamic shard rebalancing

## High Availability

### Fault Tolerance
- Survives (replication_factor - 1) node failures
- Automatic failover to replicas
- Self-healing capabilities

### Consensus
- DAG-based consensus for distributed coordination
- Leader election for cluster operations
- Vector clocks for causality tracking

## Performance Tuning

### Replication Factor
- **RF=1**: No redundancy, maximum performance
- **RF=3**: Production default, good balance
- **RF=5**: High availability, more overhead

### Shard Count
- **Formula**: `shards = nodes × 2-3`
- **Small clusters** (3-5 nodes): 6-15 shards
- **Large clusters** (10+ nodes): 20-30 shards

### Network Optimization
- Place nodes in same data center for low latency
- Use dedicated network for inter-node communication
- Enable compression for cross-DC replication

## Common Options

- `--format <format>` - Output format: json, table (default: json)
- `--verbose, -v` - Verbose output
- `--help, -h` - Show command help

## Notes

- Minimum 3 nodes recommended for production
- Replication factor ≤ number of nodes
- Graceful node removal prevents data loss
- Leader election is automatic on failures
- Consistent hashing minimizes rebalancing
- Health checks run every 30 seconds
