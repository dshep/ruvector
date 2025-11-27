/**
 * VectorDB - High-level wrapper for vector database operations
 */

import { isNativeAvailable, getNativeBindings } from '../bindings/napi.js';
import { createWasmBindings } from '../bindings/wasm.js';
import type {
  VectorEntry,
  SearchQuery,
  SearchResult,
  DbOptions,
  DistanceMetric,
  HnswConfig,
  QuantizationConfig,
  NativeBindings,
} from '../bindings/napi.js';

export {
  VectorEntry,
  SearchQuery,
  SearchResult,
  DbOptions,
  DistanceMetric,
  HnswConfig,
  QuantizationConfig,
};

/**
 * VectorDB class wrapping native bindings
 */
export class VectorDB {
  private handle: number | null = null;
  private bindings: NativeBindings | null = null;
  private options: DbOptions;

  constructor(options: Partial<DbOptions> = {}) {
    this.options = {
      dimensions: options.dimensions ?? 384,
      distance_metric: options.distance_metric ?? DistanceMetric.Cosine,
      storage_path: options.storage_path ?? './ruvector.db',
      hnsw_config: options.hnsw_config ?? {
        m: 32,
        ef_construction: 200,
        ef_search: 100,
        max_elements: 10_000_000,
      },
      quantization: options.quantization,
    };
  }

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.handle !== null) {
      throw new Error('VectorDB already initialized');
    }

    // Try native bindings first, fall back to WASM
    if (isNativeAvailable()) {
      this.bindings = getNativeBindings();
      console.log('Using native bindings for VectorDB');
    } else {
      this.bindings = await createWasmBindings();
      console.log('Using WASM bindings for VectorDB');
    }

    this.handle = await this.bindings.vectordb_new(this.options);
  }

  /**
   * Ensure the database is initialized
   */
  private ensureInitialized(): { handle: number; bindings: NativeBindings } {
    if (this.handle === null || this.bindings === null) {
      throw new Error('VectorDB not initialized. Call init() first.');
    }
    return { handle: this.handle, bindings: this.bindings };
  }

  /**
   * Insert a vector entry
   */
  async insert(entry: VectorEntry): Promise<string> {
    const { handle, bindings } = this.ensureInitialized();

    if (entry.vector.length !== this.options.dimensions) {
      throw new Error(
        `Vector dimension mismatch. Expected ${this.options.dimensions}, got ${entry.vector.length}`
      );
    }

    return await bindings.vectordb_insert(handle, entry);
  }

  /**
   * Insert multiple vectors in a batch
   */
  async insertBatch(entries: VectorEntry[]): Promise<string[]> {
    const { handle, bindings } = this.ensureInitialized();

    // Validate all entries
    for (const entry of entries) {
      if (entry.vector.length !== this.options.dimensions) {
        throw new Error(
          `Vector dimension mismatch. Expected ${this.options.dimensions}, got ${entry.vector.length}`
        );
      }
    }

    return await bindings.vectordb_insert_batch(handle, entries);
  }

  /**
   * Search for similar vectors
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const { handle, bindings } = this.ensureInitialized();

    if (query.vector.length !== this.options.dimensions) {
      throw new Error(
        `Query vector dimension mismatch. Expected ${this.options.dimensions}, got ${query.vector.length}`
      );
    }

    return await bindings.vectordb_search(handle, query);
  }

  /**
   * Search with a vector array (convenience method)
   */
  async searchVector(vector: number[], k: number = 10, options?: {
    filter?: Record<string, any>;
    ef_search?: number;
  }): Promise<SearchResult[]> {
    return this.search({
      vector,
      k,
      filter: options?.filter,
      ef_search: options?.ef_search,
    });
  }

  /**
   * Delete a vector by ID
   */
  async delete(id: string): Promise<boolean> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.vectordb_delete(handle, id);
  }

  /**
   * Get a vector by ID
   */
  async get(id: string): Promise<VectorEntry | null> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.vectordb_get(handle, id);
  }

  /**
   * Update a vector (delete + insert)
   */
  async update(id: string, entry: VectorEntry): Promise<string> {
    await this.delete(id);
    return await this.insert({ ...entry, id });
  }

  /**
   * Get the number of vectors in the database
   */
  async count(): Promise<number> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.vectordb_len(handle);
  }

  /**
   * Check if the database is empty
   */
  async isEmpty(): Promise<boolean> {
    const count = await this.count();
    return count === 0;
  }

  /**
   * Get database options
   */
  getOptions(): DbOptions {
    return { ...this.options };
  }

  /**
   * Close the database
   */
  async close(): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();
    await bindings.vectordb_close(handle);
    this.handle = null;
    this.bindings = null;
  }

  /**
   * Create a VectorDB instance with default options
   */
  static async create(dimensions: number, options?: Partial<DbOptions>): Promise<VectorDB> {
    const db = new VectorDB({ dimensions, ...options });
    await db.init();
    return db;
  }

  /**
   * Create a VectorDB instance with HNSW indexing
   */
  static async createWithHNSW(
    dimensions: number,
    hnswConfig?: Partial<HnswConfig>,
    options?: Partial<DbOptions>
  ): Promise<VectorDB> {
    const config: HnswConfig = {
      m: hnswConfig?.m ?? 32,
      ef_construction: hnswConfig?.ef_construction ?? 200,
      ef_search: hnswConfig?.ef_search ?? 100,
      max_elements: hnswConfig?.max_elements ?? 10_000_000,
    };

    const db = new VectorDB({
      dimensions,
      hnsw_config: config,
      ...options,
    });
    await db.init();
    return db;
  }
}

export default VectorDB;
