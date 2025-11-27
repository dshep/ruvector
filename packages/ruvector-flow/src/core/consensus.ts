/**
 * DAG Consensus - DAG-based consensus protocol
 */

import { isNativeAvailable, getNativeBindings } from '../bindings/napi.js';
import type {
  Transaction,
  NativeBindings,
} from '../bindings/napi.js';

export { Transaction };

export type TransactionType = 'write' | 'read' | 'delete' | 'batch' | 'system';

export interface DagVertex {
  id: string;
  node_id: string;
  transaction: Transaction;
  parents: string[];
  timestamp: string;
  vector_clock: Record<string, number>;
  signature: string;
}

/**
 * DAG-based Consensus engine for distributed transaction ordering
 */
export class DagConsensus {
  private handle: number | null = null;
  private bindings: NativeBindings | null = null;
  private nodeId: string;
  private minQuorum: number;

  constructor(nodeId: string, minQuorum: number = 2) {
    this.nodeId = nodeId;
    this.minQuorum = minQuorum;
  }

  /**
   * Initialize the consensus engine
   */
  async init(): Promise<void> {
    if (this.handle !== null) {
      throw new Error('DagConsensus already initialized');
    }

    // Consensus operations require native bindings
    if (!isNativeAvailable()) {
      throw new Error('Consensus operations require native bindings (not available in WASM)');
    }

    this.bindings = getNativeBindings();
    console.log('Using native bindings for DagConsensus');

    this.handle = await this.bindings.consensus_new(this.nodeId, this.minQuorum);
  }

  /**
   * Ensure the consensus engine is initialized
   */
  private ensureInitialized(): { handle: number; bindings: NativeBindings } {
    if (this.handle === null || this.bindings === null) {
      throw new Error('DagConsensus not initialized. Call init() first.');
    }
    return { handle: this.handle, bindings: this.bindings };
  }

  /**
   * Submit a transaction to the consensus system
   */
  async submitTransaction(transaction: Transaction): Promise<string> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.consensus_submit_transaction(handle, transaction);
  }

  /**
   * Submit a write transaction
   */
  async submitWrite(data: Uint8Array, nonce?: number): Promise<string> {
    return this.submitTransaction({
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      tx_type: 'write',
      data,
      nonce: nonce ?? Date.now(),
    });
  }

  /**
   * Submit a read transaction
   */
  async submitRead(data: Uint8Array, nonce?: number): Promise<string> {
    return this.submitTransaction({
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      tx_type: 'read',
      data,
      nonce: nonce ?? Date.now(),
    });
  }

  /**
   * Submit a delete transaction
   */
  async submitDelete(data: Uint8Array, nonce?: number): Promise<string> {
    return this.submitTransaction({
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      tx_type: 'delete',
      data,
      nonce: nonce ?? Date.now(),
    });
  }

  /**
   * Finalize a vertex in the DAG
   */
  async finalizeVertex(vertexId: string): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();
    await bindings.consensus_finalize_vertex(handle, vertexId);
  }

  /**
   * Get the finalized transaction order
   */
  async getFinalizedOrder(): Promise<string[]> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.consensus_get_finalized_order(handle);
  }

  /**
   * Check if a vertex is finalized
   */
  async isFinalized(vertexId: string): Promise<boolean> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.consensus_is_finalized(handle, vertexId);
  }

  /**
   * Get the node ID
   */
  getNodeId(): string {
    return this.nodeId;
  }

  /**
   * Get minimum quorum size
   */
  getMinQuorum(): number {
    return this.minQuorum;
  }

  /**
   * Close the consensus engine
   */
  async close(): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();
    await bindings.consensus_close(handle);
    this.handle = null;
    this.bindings = null;
  }

  /**
   * Create a consensus engine with default settings
   */
  static async create(nodeId?: string, minQuorum?: number): Promise<DagConsensus> {
    const consensus = new DagConsensus(
      nodeId ?? `node-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      minQuorum ?? 2
    );
    await consensus.init();
    return consensus;
  }

  /**
   * Create a consensus engine for high availability
   */
  static async createHighAvailability(nodeId?: string): Promise<DagConsensus> {
    const consensus = new DagConsensus(
      nodeId ?? `node-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      3 // Require quorum of 3 for HA
    );
    await consensus.init();
    return consensus;
  }

  /**
   * Create a consensus engine for development (single node)
   */
  static async createDevelopment(nodeId?: string): Promise<DagConsensus> {
    const consensus = new DagConsensus(
      nodeId ?? 'dev-node',
      1 // Single node quorum for development
    );
    await consensus.init();
    return consensus;
  }
}

export default DagConsensus;
