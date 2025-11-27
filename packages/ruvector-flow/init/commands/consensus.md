# Consensus Protocol Commands

DAG-based consensus operations for distributed coordination and ordering.

## Commands

### /consensus submit

Submit a transaction to the consensus layer.

**Syntax:**
```bash
/consensus submit --operation <op> [options]
```

**Arguments:**
- `--operation <op>` - Operation type: insert, update, delete, index
- `--collection <name>` - Target collection
- `--data <json>` - Operation data as JSON
- `--priority <level>` - Priority level: low, normal, high (default: normal)

**Example:**
```bash
/consensus submit --operation insert --collection products --data '{"vector":[0.1,0.2]}'
/consensus submit --operation update --collection embeddings --data '{"id":"vec-1","vector":[0.3,0.4]}' --priority high
/consensus submit --operation delete --collection old-data --data '{"id":"item-5"}'
```

**Returns:**
```json
{
  "transaction_id": "tx-abc123",
  "vertex_id": "v-xyz789",
  "status": "submitted",
  "timestamp": "2024-01-20T10:30:45.123Z",
  "parents": ["v-abc456", "v-def789"]
}
```

---

### /consensus finalize

Finalize vertices in the consensus DAG.

**Syntax:**
```bash
/consensus finalize [options]
```

**Arguments:**
- `--vertex <id>` - Finalize specific vertex
- `--threshold <n>` - Confirmation threshold (default: 6)
- `--auto` - Auto-finalize based on depth

**Example:**
```bash
/consensus finalize --vertex v-xyz789
/consensus finalize --threshold 10 --auto
/consensus finalize
```

**Returns:**
```json
{
  "finalized": [
    {
      "vertex_id": "v-xyz789",
      "transaction_id": "tx-abc123",
      "confirmations": 10,
      "depth": 15,
      "finalized_at": "2024-01-20T10:31:00.456Z"
    }
  ],
  "count": 1
}
```

---

### /consensus order

Get total ordering of transactions.

**Syntax:**
```bash
/consensus order [options]
```

**Arguments:**
- `--start <timestamp>` - Start timestamp
- `--end <timestamp>` - End timestamp
- `--limit <n>` - Number of transactions (default: 100)

**Example:**
```bash
/consensus order --limit 50
/consensus order --start "2024-01-20T10:00:00Z" --end "2024-01-20T11:00:00Z"
```

**Returns:**
```json
{
  "transactions": [
    {
      "order": 1,
      "transaction_id": "tx-abc123",
      "vertex_id": "v-xyz789",
      "operation": "insert",
      "collection": "products",
      "timestamp": "2024-01-20T10:30:45.123Z",
      "node": "node-1"
    },
    {
      "order": 2,
      "transaction_id": "tx-def456",
      "vertex_id": "v-uvw012",
      "operation": "update",
      "collection": "embeddings",
      "timestamp": "2024-01-20T10:30:46.789Z",
      "node": "node-2"
    }
  ],
  "count": 2,
  "total_ordered": 10000
}
```

---

### /consensus stats

Get consensus layer statistics.

**Syntax:**
```bash
/consensus stats
```

**Example:**
```bash
/consensus stats
```

**Returns:**
```json
{
  "dag": {
    "vertices": 10000,
    "edges": 25000,
    "tips": 5,
    "depth": 1500,
    "finalized_vertices": 9500,
    "pending_vertices": 500
  },
  "transactions": {
    "total": 10000,
    "finalized": 9500,
    "pending": 500,
    "throughput_tps": 150,
    "avg_confirmation_time_ms": 250
  },
  "performance": {
    "submit_latency_ms": 5.2,
    "finalize_latency_ms": 245.8,
    "ordering_latency_ms": 125.3
  },
  "conflicts": {
    "detected": 15,
    "resolved": 15,
    "pending": 0
  }
}
```

---

### /consensus prune

Prune old finalized vertices from the DAG.

**Syntax:**
```bash
/consensus prune [options]
```

**Arguments:**
- `--before <timestamp>` - Prune vertices before timestamp
- `--keep <n>` - Keep last N finalized vertices (default: 10000)
- `--dry-run` - Show what would be pruned without executing

**Example:**
```bash
/consensus prune --keep 5000
/consensus prune --before "2024-01-01T00:00:00Z"
/consensus prune --dry-run
```

**Returns:**
```json
{
  "pruned": 5000,
  "kept": 5000,
  "freed_bytes": 52428800,
  "duration_ms": 1234
}
```

---

### /consensus conflicts

Detect and resolve conflicts in the DAG.

**Syntax:**
```bash
/consensus conflicts [options]
```

**Arguments:**
- `--auto-resolve` - Automatically resolve conflicts
- `--strategy <strategy>` - Resolution strategy: timestamp, node-priority, manual (default: timestamp)

**Example:**
```bash
/consensus conflicts
/consensus conflicts --auto-resolve --strategy timestamp
```

**Returns:**
```json
{
  "conflicts": [
    {
      "conflict_id": "conflict-1",
      "vertices": ["v-abc123", "v-def456"],
      "transactions": ["tx-001", "tx-002"],
      "type": "double-spend",
      "detected_at": "2024-01-20T10:30:50.000Z",
      "resolution": "tx-001 chosen (earlier timestamp)",
      "resolved": true
    }
  ],
  "total": 1,
  "resolved": 1,
  "pending": 0
}
```

---

### /consensus clock

Get vector clock information for causality tracking.

**Syntax:**
```bash
/consensus clock [options]
```

**Arguments:**
- `--node <id>` - Get clock for specific node
- `--compare <clock1> <clock2>` - Compare two vector clocks

**Example:**
```bash
/consensus clock
/consensus clock --node node-1
/consensus clock --compare "node-1:10,node-2:5" "node-1:12,node-2:6"
```

**Returns:**
```json
{
  "vector_clock": {
    "node-1": 100,
    "node-2": 95,
    "node-3": 98
  },
  "local_node": "node-1",
  "synchronized": true
}
```

**Comparison Response:**
```json
{
  "clock1": {"node-1": 10, "node-2": 5},
  "clock2": {"node-1": 12, "node-2": 6},
  "relationship": "clock1 < clock2",
  "concurrent": false
}
```

---

## DAG Consensus Overview

### Directed Acyclic Graph (DAG)
- Each transaction is a vertex in the DAG
- Vertices reference 1-2 parent vertices
- No cycles allowed (acyclic property)
- Multiple tips allow parallel transaction submission

### Consensus Process

1. **Submit**: Transaction creates a new vertex referencing parent(s)
2. **Propagate**: Vertex propagated to all nodes
3. **Confirm**: Vertices gain confirmations as new vertices reference them
4. **Finalize**: Vertices with sufficient confirmations (depth ≥ threshold) are finalized
5. **Order**: Finalized vertices are totally ordered using topological sort

### Conflict Resolution

#### Double-Spend Detection
```
       v1 (insert id=1)
      /  \
    v2    v3 (both insert id=1)
     \    /
      v4  ← Conflict detected
```

#### Resolution Strategies
- **Timestamp**: Earlier transaction wins
- **Node Priority**: Higher priority node wins
- **Manual**: Requires human intervention

### Vector Clocks

Track causality between distributed events:
```json
{
  "node-1": 10,  // Node 1 has seen 10 events
  "node-2": 5,   // Node 2 has seen 5 events
  "node-3": 8    // Node 3 has seen 8 events
}
```

**Relationships:**
- `A < B`: A happened before B (causally related)
- `A > B`: B happened before A (causally related)
- `A || B`: Concurrent events (no causal relationship)

## Performance Characteristics

### Throughput
- **Linear scaling**: More nodes = more tips = higher throughput
- **Typical**: 100-500 TPS per node
- **Peak**: 1000+ TPS in large clusters

### Latency
- **Submit**: 5-10ms (local operation)
- **Confirmation**: 100-500ms (6+ confirmations)
- **Finalization**: 200-1000ms (threshold dependent)

### Tuning Parameters
- **Confirmation Threshold**: Higher = more security, lower throughput
- **Tip Selection**: More parents = better security, higher overhead
- **Prune Frequency**: Balance between storage and query performance

## Best Practices

### Transaction Submission
- Batch related operations
- Use appropriate priority levels
- Handle submission failures gracefully

### Finalization
- Set threshold based on security requirements
- Monitor finalization rate
- Adjust auto-finalize settings

### Conflict Prevention
- Use unique transaction IDs
- Implement retry logic with exponential backoff
- Coordinate conflicting operations

### Pruning
- Prune regularly to manage storage
- Keep sufficient history for debugging
- Backup before major pruning

## Common Options

- `--format <format>` - Output format: json, table (default: json)
- `--verbose, -v` - Verbose output with DAG details
- `--help, -h` - Show command help

## Notes

- DAG consensus is Byzantine fault tolerant
- Confirmation threshold typically 6-10 for production
- Vector clocks enable causal consistency
- Conflicts are rare in well-designed systems
- Pruning is essential for long-running clusters
- Finalization is irreversible
