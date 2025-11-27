/**
 * Collection Manager - Multi-collection management with aliases
 */

import { isNativeAvailable, getNativeBindings } from '../bindings/napi.js';
import { createWasmBindings } from '../bindings/wasm.js';
import type {
  CollectionConfig,
  DistanceMetric,
  HnswConfig,
  QuantizationConfig,
  NativeBindings,
} from '../bindings/napi.js';
import { VectorDB } from './vector.js';

export { CollectionConfig, DistanceMetric, HnswConfig, QuantizationConfig };

export interface CollectionStats {
  name: string;
  vector_count: number;
  dimensions: number;
  distance_metric: DistanceMetric;
}

/**
 * Collection Manager class for organizing multiple vector databases
 */
export class CollectionManager {
  private handle: number | null = null;
  private bindings: NativeBindings | null = null;
  private basePath: string;
  private collections: Map<string, number> = new Map();

  constructor(basePath: string = './collections') {
    this.basePath = basePath;
  }

  /**
   * Initialize the collection manager
   */
  async init(): Promise<void> {
    if (this.handle !== null) {
      throw new Error('CollectionManager already initialized');
    }

    // Try native bindings first, fall back to WASM
    if (isNativeAvailable()) {
      this.bindings = getNativeBindings();
      console.log('Using native bindings for CollectionManager');
    } else {
      this.bindings = await createWasmBindings();
      console.log('Using WASM bindings for CollectionManager');
    }

    this.handle = await this.bindings.collection_manager_new(this.basePath);
  }

  /**
   * Ensure the manager is initialized
   */
  private ensureInitialized(): { handle: number; bindings: NativeBindings } {
    if (this.handle === null || this.bindings === null) {
      throw new Error('CollectionManager not initialized. Call init() first.');
    }
    return { handle: this.handle, bindings: this.bindings };
  }

  /**
   * Create a new collection
   */
  async createCollection(name: string, config: CollectionConfig): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();
    await bindings.collection_create(handle, name, config);
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name: string): Promise<boolean> {
    const { handle, bindings } = this.ensureInitialized();
    const deleted = await bindings.collection_delete(handle, name);
    if (deleted) {
      this.collections.delete(name);
    }
    return deleted;
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<string[]> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.collection_list(handle);
  }

  /**
   * Get a collection by name
   */
  async getCollection(name: string): Promise<number | null> {
    const { handle, bindings } = this.ensureInitialized();

    // Check cache first
    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }

    const collectionHandle = await bindings.collection_get(handle, name);
    if (collectionHandle !== null) {
      this.collections.set(name, collectionHandle);
    }
    return collectionHandle;
  }

  /**
   * Check if a collection exists
   */
  async collectionExists(name: string): Promise<boolean> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.collection_exists(handle, name);
  }

  /**
   * Create an alias for a collection
   */
  async createAlias(alias: string, collection: string): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();

    // Verify collection exists
    const exists = await this.collectionExists(collection);
    if (!exists) {
      throw new Error(`Collection '${collection}' does not exist`);
    }

    await bindings.collection_create_alias(handle, alias, collection);
  }

  /**
   * Delete an alias
   */
  async deleteAlias(alias: string): Promise<boolean> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.collection_delete_alias(handle, alias);
  }

  /**
   * List all aliases
   */
  async listAliases(): Promise<Record<string, string>> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.collection_list_aliases(handle);
  }

  /**
   * Get collection by name or alias
   */
  async getCollectionByNameOrAlias(nameOrAlias: string): Promise<number | null> {
    // Try direct lookup first
    let handle = await this.getCollection(nameOrAlias);
    if (handle !== null) return handle;

    // Check if it's an alias
    const aliases = await this.listAliases();
    const actualName = aliases[nameOrAlias];
    if (actualName) {
      return await this.getCollection(actualName);
    }

    return null;
  }

  /**
   * Close the collection manager
   */
  async close(): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();
    await bindings.collection_manager_close(handle);
    this.handle = null;
    this.bindings = null;
    this.collections.clear();
  }

  /**
   * Create a collection manager with default settings
   */
  static async create(basePath?: string): Promise<CollectionManager> {
    const manager = new CollectionManager(basePath);
    await manager.init();
    return manager;
  }

  /**
   * Helper: Create a collection with HNSW indexing
   */
  async createHNSWCollection(
    name: string,
    dimensions: number,
    options?: {
      metric?: DistanceMetric;
      hnswConfig?: Partial<HnswConfig>;
      quantization?: QuantizationConfig;
      onDiskPayload?: boolean;
    }
  ): Promise<void> {
    const config: CollectionConfig = {
      dimensions,
      distance_metric: options?.metric ?? DistanceMetric.Cosine,
      hnsw_config: {
        m: options?.hnswConfig?.m ?? 32,
        ef_construction: options?.hnswConfig?.ef_construction ?? 200,
        ef_search: options?.hnswConfig?.ef_search ?? 100,
        max_elements: options?.hnswConfig?.max_elements ?? 10_000_000,
      },
      quantization: options?.quantization,
      on_disk_payload: options?.onDiskPayload ?? true,
    };

    await this.createCollection(name, config);
  }

  /**
   * Helper: Create a simple flat index collection
   */
  async createFlatCollection(
    name: string,
    dimensions: number,
    options?: {
      metric?: DistanceMetric;
      onDiskPayload?: boolean;
    }
  ): Promise<void> {
    const config: CollectionConfig = {
      dimensions,
      distance_metric: options?.metric ?? DistanceMetric.Cosine,
      hnsw_config: undefined, // No HNSW = flat index
      quantization: undefined,
      on_disk_payload: options?.onDiskPayload ?? true,
    };

    await this.createCollection(name, config);
  }
}

export default CollectionManager;
