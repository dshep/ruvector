/**
 * @ruvector/flow - TypeScript bindings for ruvector vector database
 *
 * High-performance vector database with HNSW indexing, SIMD optimizations,
 * and distributed clustering capabilities.
 */

// Core exports
export { VectorDB } from './core/vector.js';
export { HNSWIndex } from './core/index.js';
export { CollectionManager } from './core/collection.js';
export { ClusterManager } from './core/cluster.js';
export { DagConsensus } from './core/consensus.js';

// Type exports
export type {
  VectorEntry,
  SearchQuery,
  SearchResult,
  DbOptions,
  DistanceMetric,
  HnswConfig,
  QuantizationConfig,
} from './bindings/napi.js';

export type {
  CollectionConfig,
  CollectionStats,
} from './core/collection.js';

export type {
  ClusterConfig,
  ClusterNode,
  NodeStatus,
  ShardInfo,
  ClusterStats,
} from './core/cluster.js';

export type {
  Transaction,
  TransactionType,
  DagVertex,
} from './core/consensus.js';

export type {
  IndexStats,
} from './core/index.js';

// Binding utilities
export { isNativeAvailable } from './bindings/napi.js';
export { isWasmAvailable } from './bindings/wasm.js';

// Re-export enums
export { DistanceMetric } from './bindings/napi.js';

/**
 * Version information
 */
export const VERSION = '0.1.0';

/**
 * Default exports for convenience
 */
import { VectorDB } from './core/vector.js';
import { HNSWIndex } from './core/index.js';
import { CollectionManager } from './core/collection.js';
import { ClusterManager } from './core/cluster.js';
import { DagConsensus } from './core/consensus.js';

export default {
  VectorDB,
  HNSWIndex,
  CollectionManager,
  ClusterManager,
  DagConsensus,
  VERSION,
};
