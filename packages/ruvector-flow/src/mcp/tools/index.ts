/**
 * MCP Tool Registry
 *
 * Registers all 111+ tools across 14 categories:
 * 1. Vector (8 tools)
 * 2. Index (7 tools)
 * 3. Collection (9 tools)
 * 4. Filter (15 tools)
 * 5. Cluster (10 tools)
 * 6. Consensus (7 tools)
 * 7. Discovery (7 tools)
 * 8. Quantization (5 tools)
 * 9. Storage (7 tools)
 * 10. Metrics (6 tools)
 * 11. Server (6 tools)
 * 12. Benchmark (6 tools)
 * 13. Router (7 tools)
 * 14. Swarm (11 tools)
 *
 * @module mcp/tools
 */

import type { MCPTool, MCPToolRegistry, MCPToolHandler } from '../types.js';

/**
 * Create the complete tool registry
 *
 * @returns Map of tool name to handler and schema
 */
export function createToolRegistry(): MCPToolRegistry {
  const registry: MCPToolRegistry = new Map();

  // Register all tool categories
  registerVectorTools(registry);
  registerIndexTools(registry);
  registerCollectionTools(registry);
  registerFilterTools(registry);
  registerClusterTools(registry);
  registerConsensusTools(registry);
  registerDiscoveryTools(registry);
  registerQuantizationTools(registry);
  registerStorageTools(registry);
  registerMetricsTools(registry);
  registerServerTools(registry);
  registerBenchmarkTools(registry);
  registerRouterTools(registry);
  registerSwarmTools(registry);

  return registry;
}

// ============================================================================
// 1. Vector Tools (8 tools)
// ============================================================================

function registerVectorTools(registry: MCPToolRegistry): void {
  // vector_insert
  registry.set('vector_insert', {
    schema: {
      name: 'vector_insert',
      description: 'Insert a single vector into the database',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' },
          id: { type: 'string', description: 'Vector ID' },
          vector: { type: 'array', items: { type: 'number' }, description: 'Vector data' },
          metadata: { type: 'object', description: 'Optional metadata' }
        },
        required: ['collection', 'id', 'vector']
      }
    },
    handler: async (args) => {
      // TODO: Implement vector insert via NAPI bindings
      return { success: true, id: args.id, message: 'Vector inserted' };
    }
  });

  // vector_insert_batch
  registry.set('vector_insert_batch', {
    schema: {
      name: 'vector_insert_batch',
      description: 'Insert multiple vectors in batch',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' },
          vectors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                vector: { type: 'array', items: { type: 'number' } },
                metadata: { type: 'object' }
              },
              required: ['id', 'vector']
            },
            description: 'Array of vectors to insert'
          }
        },
        required: ['collection', 'vectors']
      }
    },
    handler: async (args) => {
      // TODO: Implement batch insert
      return { success: true, count: args.vectors?.length ?? 0, message: 'Batch inserted' };
    }
  });

  // vector_search
  registry.set('vector_search', {
    schema: {
      name: 'vector_search',
      description: 'Search for k nearest neighbors',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' },
          vector: { type: 'array', items: { type: 'number' }, description: 'Query vector' },
          k: { type: 'number', description: 'Number of results', default: 10 },
          filter: { type: 'object', description: 'Optional filter' }
        },
        required: ['collection', 'vector']
      }
    },
    handler: async (args) => {
      // TODO: Implement vector search
      return { results: [], count: 0, took: 0 };
    }
  });

  // vector_delete
  registry.set('vector_delete', {
    schema: {
      name: 'vector_delete',
      description: 'Delete a vector by ID',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' },
          id: { type: 'string', description: 'Vector ID' }
        },
        required: ['collection', 'id']
      }
    },
    handler: async (args) => {
      // TODO: Implement vector delete
      return { success: true, id: args.id, message: 'Vector deleted' };
    }
  });

  // vector_update
  registry.set('vector_update', {
    schema: {
      name: 'vector_update',
      description: 'Update a vector by ID',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' },
          id: { type: 'string', description: 'Vector ID' },
          vector: { type: 'array', items: { type: 'number' }, description: 'New vector data' },
          metadata: { type: 'object', description: 'Optional metadata' }
        },
        required: ['collection', 'id']
      }
    },
    handler: async (args) => {
      // TODO: Implement vector update
      return { success: true, id: args.id, message: 'Vector updated' };
    }
  });

  // vector_get
  registry.set('vector_get', {
    schema: {
      name: 'vector_get',
      description: 'Get a vector by ID',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' },
          id: { type: 'string', description: 'Vector ID' }
        },
        required: ['collection', 'id']
      }
    },
    handler: async (args) => {
      // TODO: Implement vector get
      return { id: args.id, vector: [], metadata: {} };
    }
  });

  // vector_scroll
  registry.set('vector_scroll', {
    schema: {
      name: 'vector_scroll',
      description: 'Scroll/iterate through vectors',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' },
          cursor: { type: 'string', description: 'Scroll cursor' },
          limit: { type: 'number', description: 'Batch size', default: 100 }
        },
        required: ['collection']
      }
    },
    handler: async (args) => {
      // TODO: Implement vector scroll
      return { vectors: [], cursor: null, hasMore: false };
    }
  });

  // vector_count
  registry.set('vector_count', {
    schema: {
      name: 'vector_count',
      description: 'Count vectors in collection',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' },
          filter: { type: 'object', description: 'Optional filter' }
        },
        required: ['collection']
      }
    },
    handler: async (args) => {
      // TODO: Implement vector count
      return { count: 0, collection: args.collection };
    }
  });
}

// ============================================================================
// 2. Index Tools (7 tools)
// ============================================================================

function registerIndexTools(registry: MCPToolRegistry): void {
  registry.set('index_create_hnsw', {
    schema: {
      name: 'index_create_hnsw',
      description: 'Create HNSW index for fast search',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' },
          m: { type: 'number', description: 'HNSW M parameter', default: 16 },
          efConstruction: { type: 'number', description: 'HNSW ef construction', default: 200 }
        },
        required: ['collection']
      }
    },
    handler: async (args) => ({ success: true, message: 'HNSW index created' })
  });

  registry.set('index_create_flat', {
    schema: {
      name: 'index_create_flat',
      description: 'Create flat (brute force) index',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' }
        },
        required: ['collection']
      }
    },
    handler: async (args) => ({ success: true, message: 'Flat index created' })
  });

  registry.set('index_build', {
    schema: {
      name: 'index_build',
      description: 'Build or rebuild index',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' }
        },
        required: ['collection']
      }
    },
    handler: async (args) => ({ success: true, message: 'Index built' })
  });

  registry.set('index_stats', {
    schema: {
      name: 'index_stats',
      description: 'Get index statistics',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' }
        },
        required: ['collection']
      }
    },
    handler: async (args) => ({ type: 'hnsw', vectorCount: 0, segments: 0 })
  });

  registry.set('index_optimize', {
    schema: {
      name: 'index_optimize',
      description: 'Optimize index for performance',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' }
        },
        required: ['collection']
      }
    },
    handler: async (args) => ({ success: true, message: 'Index optimized' })
  });

  registry.set('index_rebuild', {
    schema: {
      name: 'index_rebuild',
      description: 'Rebuild index from scratch',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' }
        },
        required: ['collection']
      }
    },
    handler: async (args) => ({ success: true, message: 'Index rebuilt' })
  });

  registry.set('index_delete', {
    schema: {
      name: 'index_delete',
      description: 'Delete an index',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' }
        },
        required: ['collection']
      }
    },
    handler: async (args) => ({ success: true, message: 'Index deleted' })
  });
}

// ============================================================================
// 3. Collection Tools (9 tools)
// ============================================================================

function registerCollectionTools(registry: MCPToolRegistry): void {
  registry.set('collection_create', {
    schema: {
      name: 'collection_create',
      description: 'Create a new collection',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Collection name' },
          dimension: { type: 'number', description: 'Vector dimension' },
          distance: { type: 'string', enum: ['cosine', 'euclidean', 'dot'], default: 'cosine' }
        },
        required: ['name', 'dimension']
      }
    },
    handler: async (args) => ({ success: true, name: args.name, message: 'Collection created' })
  });

  registry.set('collection_delete', {
    schema: {
      name: 'collection_delete',
      description: 'Delete a collection',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Collection name' }
        },
        required: ['name']
      }
    },
    handler: async (args) => ({ success: true, message: 'Collection deleted' })
  });

  registry.set('collection_list', {
    schema: {
      name: 'collection_list',
      description: 'List all collections',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    handler: async () => ({ collections: [] })
  });

  registry.set('collection_stats', {
    schema: {
      name: 'collection_stats',
      description: 'Get collection statistics',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Collection name' }
        },
        required: ['name']
      }
    },
    handler: async (args) => ({ name: args.name, vectorCount: 0, dimension: 0 })
  });

  registry.set('collection_info', {
    schema: {
      name: 'collection_info',
      description: 'Get collection information',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Collection name' }
        },
        required: ['name']
      }
    },
    handler: async (args) => ({ name: args.name, dimension: 0, distance: 'cosine' })
  });

  registry.set('alias_create', {
    schema: {
      name: 'alias_create',
      description: 'Create collection alias',
      inputSchema: {
        type: 'object',
        properties: {
          alias: { type: 'string', description: 'Alias name' },
          collection: { type: 'string', description: 'Collection name' }
        },
        required: ['alias', 'collection']
      }
    },
    handler: async (args) => ({ success: true, message: 'Alias created' })
  });

  registry.set('alias_delete', {
    schema: {
      name: 'alias_delete',
      description: 'Delete collection alias',
      inputSchema: {
        type: 'object',
        properties: {
          alias: { type: 'string', description: 'Alias name' }
        },
        required: ['alias']
      }
    },
    handler: async (args) => ({ success: true, message: 'Alias deleted' })
  });

  registry.set('alias_list', {
    schema: {
      name: 'alias_list',
      description: 'List all aliases',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    handler: async () => ({ aliases: [] })
  });

  registry.set('alias_switch', {
    schema: {
      name: 'alias_switch',
      description: 'Switch alias to different collection',
      inputSchema: {
        type: 'object',
        properties: {
          alias: { type: 'string', description: 'Alias name' },
          collection: { type: 'string', description: 'New collection name' }
        },
        required: ['alias', 'collection']
      }
    },
    handler: async (args) => ({ success: true, message: 'Alias switched' })
  });
}

// ============================================================================
// 4. Filter Tools (15 tools)
// ============================================================================

function registerFilterTools(registry: MCPToolRegistry): void {
  const filterTools = [
    'filter_eq', 'filter_ne', 'filter_gt', 'filter_lt', 'filter_range',
    'filter_in', 'filter_not_in', 'filter_geo_radius', 'filter_geo_bbox',
    'filter_match_text', 'filter_match_phrase', 'filter_combine',
    'filter_index_create', 'filter_index_list', 'filter_test'
  ];

  filterTools.forEach(name => {
    registry.set(name, {
      schema: {
        name,
        description: `Filter operation: ${name}`,
        inputSchema: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'Field name' },
            value: { description: 'Filter value' }
          },
          required: ['field']
        }
      },
      handler: async (args) => ({ success: true, filter: name })
    });
  });
}

// ============================================================================
// 5-14. Remaining Tool Categories (Stubs)
// ============================================================================

function registerClusterTools(registry: MCPToolRegistry): void {
  const tools = [
    'cluster_init', 'cluster_node_add', 'cluster_node_remove', 'cluster_node_list',
    'cluster_shard_list', 'cluster_shard_rebalance', 'cluster_stats',
    'cluster_health', 'cluster_ring_info', 'cluster_leader'
  ];
  tools.forEach(name => registerStubTool(registry, name, 'Cluster management'));
}

function registerConsensusTools(registry: MCPToolRegistry): void {
  const tools = [
    'consensus_submit', 'consensus_finalize', 'consensus_order',
    'consensus_stats', 'consensus_prune', 'consensus_conflicts', 'consensus_clock'
  ];
  tools.forEach(name => registerStubTool(registry, name, 'DAG consensus'));
}

function registerDiscoveryTools(registry: MCPToolRegistry): void {
  const tools = [
    'discovery_static', 'discovery_gossip', 'discovery_multicast',
    'discovery_status', 'discovery_register', 'discovery_unregister', 'discovery_heartbeat'
  ];
  tools.forEach(name => registerStubTool(registry, name, 'Service discovery'));
}

function registerQuantizationTools(registry: MCPToolRegistry): void {
  const tools = [
    'quantize_scalar', 'quantize_product', 'quantize_binary',
    'quantize_stats', 'quantize_decode'
  ];
  tools.forEach(name => registerStubTool(registry, name, 'Vector quantization'));
}

function registerStorageTools(registry: MCPToolRegistry): void {
  const tools = [
    'snapshot_create', 'snapshot_restore', 'snapshot_list',
    'wal_enable', 'wal_replay', 'storage_mmap', 'storage_compact'
  ];
  tools.forEach(name => registerStubTool(registry, name, 'Storage & persistence'));
}

function registerMetricsTools(registry: MCPToolRegistry): void {
  const tools = [
    'metrics_export', 'health_check', 'readiness_check',
    'liveness_check', 'metrics_custom', 'metrics_histogram'
  ];
  tools.forEach(name => registerStubTool(registry, name, 'Metrics & monitoring'));
}

function registerServerTools(registry: MCPToolRegistry): void {
  const tools = [
    'server_start', 'server_stop', 'server_status',
    'server_cors', 'server_compression', 'server_rate_limit'
  ];
  tools.forEach(name => registerStubTool(registry, name, 'REST API server'));
}

function registerBenchmarkTools(registry: MCPToolRegistry): void {
  const tools = [
    'bench_run', 'bench_generate', 'bench_compare',
    'bench_report', 'bench_latency', 'bench_memory'
  ];
  tools.forEach(name => registerStubTool(registry, name, 'Benchmarking'));
}

function registerRouterTools(registry: MCPToolRegistry): void {
  const tools = [
    'router_init', 'router_route', 'router_candidates',
    'router_optimize', 'router_benchmark', 'router_circuit', 'router_uncertainty'
  ];
  tools.forEach(name => registerStubTool(registry, name, 'AI routing'));
}

function registerSwarmTools(registry: MCPToolRegistry): void {
  const tools = [
    'swarm_init', 'swarm_status', 'swarm_scale', 'agent_spawn',
    'agent_list', 'agent_metrics', 'task_orchestrate', 'task_status',
    'memory_store', 'memory_retrieve', 'memory_usage'
  ];
  tools.forEach(name => registerStubTool(registry, name, 'Swarm orchestration'));
}

/**
 * Register a stub tool (placeholder implementation)
 */
function registerStubTool(
  registry: MCPToolRegistry,
  name: string,
  category: string
): void {
  registry.set(name, {
    schema: {
      name,
      description: `${category}: ${name}`,
      inputSchema: {
        type: 'object',
        properties: {
          params: { type: 'object', description: 'Tool parameters' }
        }
      }
    },
    handler: async (args) => ({
      success: true,
      tool: name,
      category,
      message: 'Tool implementation pending'
    })
  });
}

/**
 * Export tool categories for external use
 */
export const TOOL_CATEGORIES = {
  VECTOR: 'vector',
  INDEX: 'index',
  COLLECTION: 'collection',
  FILTER: 'filter',
  CLUSTER: 'cluster',
  CONSENSUS: 'consensus',
  DISCOVERY: 'discovery',
  QUANTIZATION: 'quantization',
  STORAGE: 'storage',
  METRICS: 'metrics',
  SERVER: 'server',
  BENCHMARK: 'benchmark',
  ROUTER: 'router',
  SWARM: 'swarm'
} as const;
