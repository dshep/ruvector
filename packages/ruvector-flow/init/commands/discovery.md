# Discovery Service Commands

Service discovery operations for automatic node detection and cluster formation.

## Commands

### /discovery static

Configure static node discovery with predefined node list.

**Syntax:**
```bash
/discovery static --nodes <nodes> [options]
```

**Arguments:**
- `--nodes <nodes>` - Comma-separated list of node addresses (host:port)
- `--enable` - Enable static discovery
- `--disable` - Disable static discovery

**Example:**
```bash
/discovery static --nodes "node1.example.com:6333,node2.example.com:6333,node3.example.com:6333" --enable
/discovery static --nodes "192.168.1.10:6333,192.168.1.11:6333" --enable
/discovery static --disable
```

**Returns:**
```json
{
  "method": "static",
  "enabled": true,
  "nodes": [
    "node1.example.com:6333",
    "node2.example.com:6333",
    "node3.example.com:6333"
  ],
  "discovered": 3,
  "reachable": 3
}
```

---

### /discovery gossip

Configure gossip-based discovery protocol.

**Syntax:**
```bash
/discovery gossip [options]
```

**Arguments:**
- `--enable` - Enable gossip discovery
- `--disable` - Disable gossip discovery
- `--interval <ms>` - Gossip interval in milliseconds (default: 1000)
- `--fanout <n>` - Number of nodes to gossip to (default: 3)
- `--seeds <nodes>` - Seed nodes for bootstrapping

**Example:**
```bash
/discovery gossip --enable --interval 500 --fanout 5
/discovery gossip --enable --seeds "seed1.example.com:6333,seed2.example.com:6333"
/discovery gossip --disable
```

**Returns:**
```json
{
  "method": "gossip",
  "enabled": true,
  "interval_ms": 500,
  "fanout": 5,
  "seeds": [
    "seed1.example.com:6333",
    "seed2.example.com:6333"
  ],
  "discovered": 8,
  "active_peers": 5
}
```

---

### /discovery multicast

Configure multicast-based discovery for local networks.

**Syntax:**
```bash
/discovery multicast [options]
```

**Arguments:**
- `--enable` - Enable multicast discovery
- `--disable` - Disable multicast discovery
- `--group <address>` - Multicast group address (default: 239.255.0.1)
- `--port <port>` - Multicast port (default: 6334)
- `--ttl <ttl>` - Multicast TTL (default: 1)

**Example:**
```bash
/discovery multicast --enable
/discovery multicast --enable --group 239.255.0.2 --port 7000 --ttl 2
/discovery multicast --disable
```

**Returns:**
```json
{
  "method": "multicast",
  "enabled": true,
  "group": "239.255.0.1",
  "port": 6334,
  "ttl": 1,
  "discovered": 5,
  "local_network": true
}
```

---

### /discovery status

Get current discovery status and discovered nodes.

**Syntax:**
```bash
/discovery status
```

**Example:**
```bash
/discovery status
```

**Returns:**
```json
{
  "methods": {
    "static": {
      "enabled": true,
      "nodes": 3
    },
    "gossip": {
      "enabled": true,
      "active_peers": 5
    },
    "multicast": {
      "enabled": false
    }
  },
  "discovered_nodes": [
    {
      "id": "node-1",
      "address": "192.168.1.10:6333",
      "method": "static",
      "status": "healthy",
      "last_seen": "2024-01-20T10:30:45Z"
    },
    {
      "id": "node-2",
      "address": "192.168.1.11:6333",
      "method": "gossip",
      "status": "healthy",
      "last_seen": "2024-01-20T10:30:44Z"
    }
  ],
  "total_discovered": 8,
  "total_reachable": 7
}
```

---

### /discovery register

Manually register a node with the discovery service.

**Syntax:**
```bash
/discovery register --address <addr> [options]
```

**Arguments:**
- `--address <addr>` - Node address (host:port)
- `--id <id>` - Node ID (optional, auto-generated if not provided)
- `--metadata <json>` - Node metadata as JSON

**Example:**
```bash
/discovery register --address node4.example.com:6333
/discovery register --address 192.168.1.15:6333 --id custom-node --metadata '{"region":"us-west","rack":"A1"}'
```

**Returns:**
```json
{
  "node_id": "node-4",
  "address": "node4.example.com:6333",
  "status": "registered",
  "metadata": {
    "region": "us-west",
    "rack": "A1"
  }
}
```

---

### /discovery unregister

Unregister a node from the discovery service.

**Syntax:**
```bash
/discovery unregister --node <id>
```

**Arguments:**
- `--node <id>` - Node ID to unregister

**Example:**
```bash
/discovery unregister --node node-4
/discovery unregister --node custom-node
```

**Returns:**
```json
{
  "node_id": "node-4",
  "status": "unregistered"
}
```

---

### /discovery heartbeat

Send or check heartbeat status.

**Syntax:**
```bash
/discovery heartbeat [options]
```

**Arguments:**
- `--send` - Send heartbeat to all peers
- `--interval <ms>` - Heartbeat interval (default: 5000)
- `--timeout <ms>` - Node timeout (default: 15000)

**Example:**
```bash
/discovery heartbeat --send
/discovery heartbeat --interval 3000 --timeout 10000
```

**Returns:**
```json
{
  "heartbeat_interval_ms": 5000,
  "timeout_ms": 15000,
  "nodes": [
    {
      "id": "node-1",
      "last_heartbeat": "2024-01-20T10:30:45Z",
      "status": "alive",
      "latency_ms": 2.5
    },
    {
      "id": "node-2",
      "last_heartbeat": "2024-01-20T10:30:30Z",
      "status": "suspected",
      "latency_ms": 15.2
    }
  ],
  "alive": 7,
  "suspected": 1,
  "dead": 0
}
```

---

## Discovery Methods

### Static Discovery
**Best for:**
- Known cluster topology
- Fixed infrastructure
- Testing and development

**Pros:**
- Simple configuration
- Predictable behavior
- No network overhead

**Cons:**
- Manual node management
- No auto-discovery
- Requires reconfiguration on changes

---

### Gossip Discovery
**Best for:**
- Dynamic clusters
- Cloud environments
- Large-scale deployments

**Pros:**
- Automatic node discovery
- Decentralized
- Scales to thousands of nodes
- Self-healing

**Cons:**
- Network overhead
- Eventual consistency
- Requires seed nodes

**Algorithm:**
1. Each node maintains partial view of cluster
2. Periodically gossip to random peers
3. Exchange node information
4. Update local view
5. Detect and remove dead nodes

---

### Multicast Discovery
**Best for:**
- Local networks
- Development environments
- Small clusters

**Pros:**
- Zero configuration
- Automatic discovery
- Fast convergence

**Cons:**
- Local network only
- Not suitable for production
- Can create network noise
- Firewall limitations

---

## Configuration Examples

### Production Cluster (Gossip + Static Seeds)
```bash
# Configure gossip with static seeds for bootstrapping
/discovery gossip --enable --interval 1000 --fanout 3 --seeds "seed1:6333,seed2:6333,seed3:6333"

# Optionally add known nodes
/discovery static --nodes "node1:6333,node2:6333" --enable
```

### Development (Multicast)
```bash
# Enable multicast for easy local discovery
/discovery multicast --enable
```

### Fixed Infrastructure (Static Only)
```bash
# Configure all nodes statically
/discovery static --nodes "node1:6333,node2:6333,node3:6333,node4:6333,node5:6333" --enable
```

---

## Heartbeat and Failure Detection

### SWIM Protocol (Gossip)
- **Ping**: Regular heartbeat to random nodes
- **Ping-Req**: Indirect probe if direct ping fails
- **Suspect**: Mark node as suspected after timeout
- **Dead**: Remove node after sustained failure

### Heartbeat Intervals
- **Fast detection**: interval=1000ms, timeout=5000ms
- **Normal**: interval=5000ms, timeout=15000ms (default)
- **Conservative**: interval=10000ms, timeout=30000ms

---

## Network Topology

### Single Data Center
```bash
# Use multicast or gossip
/discovery multicast --enable
```

### Multi Data Center
```bash
# Use static seeds for cross-DC
/discovery gossip --enable --seeds "dc1-seed:6333,dc2-seed:6333,dc3-seed:6333"
```

### Cloud Environment
```bash
# Use gossip with cloud provider service discovery
/discovery gossip --enable --seeds "$(cloud-metadata seed-nodes)"
```

---

## Troubleshooting

### Node Not Discovered
1. Check network connectivity
2. Verify firewall rules (port 6333)
3. Confirm discovery method enabled
4. Check seed nodes are reachable

### Split Brain
- Ensure proper gossip fanout (≥3)
- Use static seeds across network partitions
- Monitor heartbeat status
- Configure appropriate timeouts

### High Network Traffic
- Reduce gossip interval
- Decrease fanout
- Disable multicast in production
- Use static discovery for known nodes

---

## Best Practices

1. **Use gossip + static seeds** for production
2. **Configure heartbeat** based on network latency
3. **Monitor discovery status** regularly
4. **Register nodes** with meaningful metadata
5. **Test failure scenarios** before deployment
6. **Use multicast** only for development
7. **Set appropriate timeouts** for your network

---

## Common Options

- `--format <format>` - Output format: json, table (default: json)
- `--verbose, -v` - Verbose output with protocol details
- `--help, -h` - Show command help

## Notes

- Multiple discovery methods can be enabled simultaneously
- Gossip requires at least one seed node to bootstrap
- Multicast only works within local network
- Heartbeat failures trigger automatic node removal
- Static nodes are always considered reachable
- Discovery runs continuously in background
