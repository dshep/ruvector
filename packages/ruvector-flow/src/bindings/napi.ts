/**
 * NAPI-RS bindings for native ruvector operations
 * Loads platform-specific .node files for optimal performance
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Platform detection
const PLATFORM = process.platform;
const ARCH = process.arch;

// Type definitions matching Rust API
export interface VectorEntry {
  id?: string;
  vector: number[];
  metadata?: Record<string, any>;
}

export interface SearchQuery {
  vector: number[];
  k: number;
  filter?: Record<string, any>;
  ef_search?: number;
}

export interface SearchResult {
  id: string;
  score: number;
  vector?: number[];
  metadata?: Record<string, any>;
}

export enum DistanceMetric {
  Euclidean = 'euclidean',
  Cosine = 'cosine',
  DotProduct = 'dotproduct',
  Manhattan = 'manhattan',
}

export interface HnswConfig {
  m: number;
  ef_construction: number;
  ef_search: number;
  max_elements: number;
}

export interface DbOptions {
  dimensions: number;
  distance_metric: DistanceMetric;
  storage_path: string;
  hnsw_config?: HnswConfig;
  quantization?: QuantizationConfig;
}

export type QuantizationConfig =
  | { type: 'none' }
  | { type: 'scalar' }
  | { type: 'product'; subspaces: number; k: number }
  | { type: 'binary' };

export interface CollectionConfig {
  dimensions: number;
  distance_metric: DistanceMetric;
  hnsw_config?: HnswConfig;
  quantization?: QuantizationConfig;
  on_disk_payload: boolean;
}

export interface ClusterConfig {
  replication_factor: number;
  shard_count: number;
  heartbeat_interval_ms: number;
  node_timeout_ms: number;
  enable_consensus: boolean;
  min_quorum_size: number;
}

export interface ClusterNode {
  node_id: string;
  address: string;
  status: 'leader' | 'follower' | 'candidate' | 'offline';
  last_seen: string;
  metadata: Record<string, string>;
  capacity: number;
}

export interface Transaction {
  id: string;
  tx_type: 'write' | 'read' | 'delete' | 'batch' | 'system';
  data: Uint8Array;
  nonce: number;
}

// Native binding interface
export interface NativeBindings {
  // VectorDB operations
  vectordb_new(options: DbOptions): Promise<number>;
  vectordb_insert(handle: number, entry: VectorEntry): Promise<string>;
  vectordb_insert_batch(handle: number, entries: VectorEntry[]): Promise<string[]>;
  vectordb_search(handle: number, query: SearchQuery): Promise<SearchResult[]>;
  vectordb_delete(handle: number, id: string): Promise<boolean>;
  vectordb_get(handle: number, id: string): Promise<VectorEntry | null>;
  vectordb_len(handle: number): Promise<number>;
  vectordb_close(handle: number): Promise<void>;

  // HNSW Index operations
  hnsw_create(dimensions: number, metric: DistanceMetric, config: HnswConfig): Promise<number>;
  hnsw_build(handle: number): Promise<void>;
  hnsw_add(handle: number, id: string, vector: number[]): Promise<void>;
  hnsw_add_batch(handle: number, entries: Array<[string, number[]]>): Promise<void>;
  hnsw_search(handle: number, vector: number[], k: number, ef_search?: number): Promise<SearchResult[]>;
  hnsw_remove(handle: number, id: string): Promise<boolean>;
  hnsw_stats(handle: number): Promise<{ layers: number; nodes: number; edges: number }>;
  hnsw_close(handle: number): Promise<void>;

  // Collection operations
  collection_manager_new(base_path: string): Promise<number>;
  collection_create(handle: number, name: string, config: CollectionConfig): Promise<void>;
  collection_delete(handle: number, name: string): Promise<boolean>;
  collection_list(handle: number): Promise<string[]>;
  collection_get(handle: number, name: string): Promise<number | null>;
  collection_exists(handle: number, name: string): Promise<boolean>;
  collection_create_alias(handle: number, alias: string, collection: string): Promise<void>;
  collection_delete_alias(handle: number, alias: string): Promise<boolean>;
  collection_list_aliases(handle: number): Promise<Record<string, string>>;
  collection_manager_close(handle: number): Promise<void>;

  // Cluster operations
  cluster_manager_new(config: ClusterConfig, node_id: string, discovery_type: string): Promise<number>;
  cluster_add_node(handle: number, node: ClusterNode): Promise<void>;
  cluster_remove_node(handle: number, node_id: string): Promise<void>;
  cluster_get_node(handle: number, node_id: string): Promise<ClusterNode | null>;
  cluster_list_nodes(handle: number): Promise<ClusterNode[]>;
  cluster_healthy_nodes(handle: number): Promise<ClusterNode[]>;
  cluster_assign_shard(handle: number, shard_id: number): Promise<any>;
  cluster_get_stats(handle: number): Promise<{
    total_nodes: number;
    healthy_nodes: number;
    total_shards: number;
    active_shards: number;
    total_vectors: number;
  }>;
  cluster_start(handle: number): Promise<void>;
  cluster_close(handle: number): Promise<void>;

  // Consensus operations
  consensus_new(node_id: string, min_quorum: number): Promise<number>;
  consensus_submit_transaction(handle: number, tx: Transaction): Promise<string>;
  consensus_finalize_vertex(handle: number, vertex_id: string): Promise<void>;
  consensus_get_finalized_order(handle: number): Promise<string[]>;
  consensus_is_finalized(handle: number, vertex_id: string): Promise<boolean>;
  consensus_close(handle: number): Promise<void>;
}

let nativeBindings: NativeBindings | null = null;

/**
 * Load the native NAPI bindings
 */
function loadNativeBindings(): NativeBindings {
  if (nativeBindings) {
    return nativeBindings;
  }

  // Try to load platform-specific binary
  const binaryName = `ruvector-${PLATFORM}-${ARCH}.node`;
  const possiblePaths = [
    // Development paths
    join(process.cwd(), 'native', binaryName),
    join(process.cwd(), '..', '..', 'native', binaryName),
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'native', binaryName),

    // Production paths
    join(dirname(fileURLToPath(import.meta.url)), '..', 'native', binaryName),
    join(dirname(fileURLToPath(import.meta.url)), 'native', binaryName),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      try {
        const require = createRequire(import.meta.url);
        nativeBindings = require(path) as NativeBindings;
        console.log(`Loaded native bindings from: ${path}`);
        return nativeBindings;
      } catch (error) {
        console.warn(`Failed to load native bindings from ${path}:`, error);
      }
    }
  }

  throw new Error(
    `Failed to load native bindings for ${PLATFORM}-${ARCH}. ` +
    `Tried paths: ${possiblePaths.join(', ')}`
  );
}

/**
 * Check if native bindings are available
 */
export function isNativeAvailable(): boolean {
  try {
    loadNativeBindings();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the native bindings instance
 */
export function getNativeBindings(): NativeBindings {
  return loadNativeBindings();
}

// Export default bindings
export default loadNativeBindings;
