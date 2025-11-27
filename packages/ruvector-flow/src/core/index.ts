/**
 * HNSW Index - High-level wrapper for HNSW index operations
 */

import { isNativeAvailable, getNativeBindings } from '../bindings/napi.js';
import { createWasmBindings } from '../bindings/wasm.js';
import type {
  DistanceMetric,
  HnswConfig,
  SearchResult,
  NativeBindings,
} from '../bindings/napi.js';

export { DistanceMetric, HnswConfig, SearchResult };

export interface IndexStats {
  layers: number;
  nodes: number;
  edges: number;
}

/**
 * HNSW Index class for approximate nearest neighbor search
 */
export class HNSWIndex {
  private handle: number | null = null;
  private bindings: NativeBindings | null = null;
  private dimensions: number;
  private metric: DistanceMetric;
  private config: HnswConfig;

  constructor(
    dimensions: number,
    metric: DistanceMetric = DistanceMetric.Cosine,
    config?: Partial<HnswConfig>
  ) {
    this.dimensions = dimensions;
    this.metric = metric;
    this.config = {
      m: config?.m ?? 32,
      ef_construction: config?.ef_construction ?? 200,
      ef_search: config?.ef_search ?? 100,
      max_elements: config?.max_elements ?? 10_000_000,
    };
  }

  /**
   * Initialize the index
   */
  async init(): Promise<void> {
    if (this.handle !== null) {
      throw new Error('HNSWIndex already initialized');
    }

    // Try native bindings first, fall back to WASM
    if (isNativeAvailable()) {
      this.bindings = getNativeBindings();
      console.log('Using native bindings for HNSWIndex');
    } else {
      this.bindings = await createWasmBindings();
      console.log('Using WASM bindings for HNSWIndex');
    }

    this.handle = await this.bindings.hnsw_create(
      this.dimensions,
      this.metric,
      this.config
    );
  }

  /**
   * Ensure the index is initialized
   */
  private ensureInitialized(): { handle: number; bindings: NativeBindings } {
    if (this.handle === null || this.bindings === null) {
      throw new Error('HNSWIndex not initialized. Call init() first.');
    }
    return { handle: this.handle, bindings: this.bindings };
  }

  /**
   * Build the index (optimize structure)
   */
  async build(): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();
    await bindings.hnsw_build(handle);
  }

  /**
   * Add a vector to the index
   */
  async add(id: string, vector: number[]): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();

    if (vector.length !== this.dimensions) {
      throw new Error(
        `Vector dimension mismatch. Expected ${this.dimensions}, got ${vector.length}`
      );
    }

    await bindings.hnsw_add(handle, id, vector);
  }

  /**
   * Add multiple vectors in a batch
   */
  async addBatch(entries: Array<[string, number[]]>): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();

    // Validate all entries
    for (const [id, vector] of entries) {
      if (vector.length !== this.dimensions) {
        throw new Error(
          `Vector dimension mismatch for ID ${id}. Expected ${this.dimensions}, got ${vector.length}`
        );
      }
    }

    await bindings.hnsw_add_batch(handle, entries);
  }

  /**
   * Search for nearest neighbors
   */
  async search(
    vector: number[],
    k: number = 10,
    ef_search?: number
  ): Promise<SearchResult[]> {
    const { handle, bindings } = this.ensureInitialized();

    if (vector.length !== this.dimensions) {
      throw new Error(
        `Query vector dimension mismatch. Expected ${this.dimensions}, got ${vector.length}`
      );
    }

    return await bindings.hnsw_search(handle, vector, k, ef_search);
  }

  /**
   * Remove a vector from the index
   */
  async remove(id: string): Promise<boolean> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.hnsw_remove(handle, id);
  }

  /**
   * Get index statistics
   */
  async stats(): Promise<IndexStats> {
    const { handle, bindings } = this.ensureInitialized();
    return await bindings.hnsw_stats(handle);
  }

  /**
   * Optimize the index structure
   */
  async optimize(): Promise<void> {
    await this.build();
  }

  /**
   * Get index configuration
   */
  getConfig(): HnswConfig {
    return { ...this.config };
  }

  /**
   * Get dimensions
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Get distance metric
   */
  getMetric(): DistanceMetric {
    return this.metric;
  }

  /**
   * Close the index
   */
  async close(): Promise<void> {
    const { handle, bindings } = this.ensureInitialized();
    await bindings.hnsw_close(handle);
    this.handle = null;
    this.bindings = null;
  }

  /**
   * Create an HNSW index with default settings
   */
  static async create(
    dimensions: number,
    metric?: DistanceMetric,
    config?: Partial<HnswConfig>
  ): Promise<HNSWIndex> {
    const index = new HNSWIndex(dimensions, metric, config);
    await index.init();
    return index;
  }

  /**
   * Create an HNSW index optimized for high recall
   */
  static async createHighRecall(
    dimensions: number,
    metric?: DistanceMetric
  ): Promise<HNSWIndex> {
    const index = new HNSWIndex(dimensions, metric, {
      m: 64,
      ef_construction: 400,
      ef_search: 200,
      max_elements: 10_000_000,
    });
    await index.init();
    return index;
  }

  /**
   * Create an HNSW index optimized for speed
   */
  static async createFast(
    dimensions: number,
    metric?: DistanceMetric
  ): Promise<HNSWIndex> {
    const index = new HNSWIndex(dimensions, metric, {
      m: 16,
      ef_construction: 100,
      ef_search: 50,
      max_elements: 10_000_000,
    });
    await index.init();
    return index;
  }
}

export default HNSWIndex;
