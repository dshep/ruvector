/**
 * Cluster Manager - Distributed clustering and sharding
 */

import { isNativeAvailable, getNativeBindings } from '../bindings/napi.js';
import { createWasmBindings } from '../bindings/wasm.js';
import type {
  ClusterConfig,
  ClusterNode,
  NativeBindings,
} from '../bindings/napi.js';

export { ClusterConfig, ClusterNode };

export type NodeStatus = 'leader' | 'follower' | 'candidate' | 'offline';

export interface ShardInfo {
  shard_id: number;
  primary_node: string;
  replica_nodes: string[];
  vector_count: number;
  status: 'active' | 'migrating' | 'replicating' | 'offline';
}

export interface ClusterStats {
  total_nodes: number;
  healthy_nodes: number;
  total_shards: number;
  active_shards: number;
  total_vectors: number;
}

/**
 * Cluster Manager for distributed vector database operations
 */
export class ClusterManager {
  private handle: number | null = null;
  private bindings: NativeBindings | null = null;
  private config: ClusterConfig;
  private nodeId: string;

  constructor(
    config: Partial<ClusterConfig> = {},
    nodeId?: string
  ) {
    this.config = {
      replication_factor: config.replication_factor ?? 3,
      shard_count: config.shard_count ?? 64,
      heartbeat_interval_ms: config.heartbeat_interval_ms ?? 5000,
      node_timeout_ms: config.node_timeout_ms ?? 30000,
      enable_consensus: config.enable_consensus ?? true,
      min_quorum_size: config.min_quorum_size ?? 2,
    };
    this.nodeId = nodeId ?? `node-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Initialize the cluster manager
   */
  async init(): Promise<void> {
    if (this.handle !== null) {
      throw new Error('ClusterManager already initialized');
    }

    // Cluster operations require native bindings
    if (!isNativeAvailable()) {
      throw new Error('Cluster operations require native bindings (not available in WASM)');
    }

    this.bindings = getNativeBindings();
    console.log('Using native bindings for ClusterManager');

    this.handle = await this.bindings.cluster_manager_new(
      this.config,
      this.nodeId,
      'static' // Discovery type: 'static', 'gossip', etc.
    );
  }

  /**
   * Ensure the manager is initialized
   */
  private ensureInitialized(): { handle: number; bindings: NativeBindings } {
    if (this.handle === null || this.bindings === null) {
      throw new Error('ClusterManager not initialized. Call init() first.');
    }
    return { handle: this.handle, bindings: this.bindings };
  }

  /**
   * Add a node to the cluster
   */
  async addNode(node: ClusterNode): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();
    await bindings.cluster_add_node(handle, node);
  }

  /**
   * Remove a node from the cluster
   */
  async removeNode(nodeId: string): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();
    await bindings.cluster_remove_node(handle, nodeId);
  }

  /**
   * Get node information by ID
   */
  async getNode(nodeId: string): Promise<ClusterNode | null> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.cluster_get_node(handle, nodeId);
  }

  /**
   * List all nodes in the cluster
   */
  async listNodes(): Promise<ClusterNode[]> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.cluster_list_nodes(handle);
  }

  /**
   * Get healthy nodes only
   */
  async healthyNodes(): Promise<ClusterNode[]> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.cluster_healthy_nodes(handle);
  }

  /**
   * Assign a shard to nodes
   */
  async assignShard(shardId: number): Promise<ShardInfo> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.cluster_assign_shard(handle, shardId);
  }

  /**
   * Get cluster statistics
   */
  async getStats(): Promise<ClusterStats> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.cluster_get_stats(handle);
  }

  /**
   * Start the cluster manager (health checks, discovery, etc.)
   */
  async start(): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();
    await bindings.cluster_start(handle);
  }

  /**
   * Get this node's ID
   */
  getNodeId(): string {
    return this.nodeId;
  }

  /**
   * Get cluster configuration
   */
  getConfig(): ClusterConfig {
    return { ...this.config };
  }

  /**
   * Close the cluster manager
   */
  async close(): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();
    await bindings.cluster_close(handle);
    this.handle = null;
    this.bindings = null;
  }

  /**
   * Create a cluster manager with default settings
   */
  static async create(
    config?: Partial<ClusterConfig>,
    nodeId?: string
  ): Promise<ClusterManager> {
    const manager = new ClusterManager(config, nodeId);
    await manager.init();
    return manager;
  }

  /**
   * Create a cluster manager with high availability settings
   */
  static async createHighAvailability(nodeId?: string): Promise<ClusterManager> {
    const manager = new ClusterManager(
      {
        replication_factor: 5,
        shard_count: 128,
        heartbeat_interval_ms: 3000,
        node_timeout_ms: 15000,
        enable_consensus: true,
        min_quorum_size: 3,
      },
      nodeId
    );
    await manager.init();
    return manager;
  }

  /**
   * Create a development cluster (single node, minimal replication)
   */
  static async createDevelopment(nodeId?: string): Promise<ClusterManager> {
    const manager = new ClusterManager(
      {
        replication_factor: 1,
        shard_count: 4,
        heartbeat_interval_ms: 10000,
        node_timeout_ms: 60000,
        enable_consensus: false,
        min_quorum_size: 1,
      },
      nodeId
    );
    await manager.init();
    return manager;
  }
}

export default ClusterManager;
