/**
 * WASM fallback bindings for ruvector operations
 * Used when native bindings are unavailable (e.g., unsupported platforms)
 */

import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type {
  VectorEntry,
  SearchQuery,
  SearchResult,
  DbOptions,
  HnswConfig,
  DistanceMetric,
  CollectionConfig,
  ClusterConfig,
  ClusterNode,
  Transaction,
  NativeBindings,
} from './napi.js';

/**
 * WASM module interface
 */
interface WasmModule {
  memory: WebAssembly.Memory;

  // VectorDB operations
  vectordb_new(options_ptr: number, options_len: number): number;
  vectordb_insert(handle: number, entry_ptr: number, entry_len: number): number;
  vectordb_insert_batch(handle: number, entries_ptr: number, entries_len: number): number;
  vectordb_search(handle: number, query_ptr: number, query_len: number): number;
  vectordb_delete(handle: number, id_ptr: number, id_len: number): number;
  vectordb_get(handle: number, id_ptr: number, id_len: number): number;
  vectordb_len(handle: number): number;
  vectordb_close(handle: number): void;

  // HNSW Index operations
  hnsw_create(dimensions: number, metric: number, config_ptr: number, config_len: number): number;
  hnsw_build(handle: number): void;
  hnsw_add(handle: number, id_ptr: number, id_len: number, vector_ptr: number, vector_len: number): void;
  hnsw_search(handle: number, vector_ptr: number, vector_len: number, k: number, ef_search: number): number;
  hnsw_remove(handle: number, id_ptr: number, id_len: number): number;
  hnsw_stats(handle: number): number;
  hnsw_close(handle: number): void;

  // Collection operations
  collection_manager_new(path_ptr: number, path_len: number): number;
  collection_create(handle: number, name_ptr: number, name_len: number, config_ptr: number, config_len: number): void;
  collection_delete(handle: number, name_ptr: number, name_len: number): number;
  collection_list(handle: number): number;
  collection_get(handle: number, name_ptr: number, name_len: number): number;

  // Memory management
  alloc(size: number): number;
  dealloc(ptr: number, size: number): void;
  get_result_ptr(): number;
  get_result_len(): number;
}

let wasmModule: WasmModule | null = null;
let wasmMemory: WebAssembly.Memory | null = null;

/**
 * Detect SIMD support
 */
function detectSIMD(): boolean {
  try {
    return WebAssembly.validate(new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x03,
      0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00,
      0xfd, 0x0c, 0xfd, 0x0c, 0x0b
    ]));
  } catch {
    return false;
  }
}

/**
 * Load WASM module
 */
async function loadWasmModule(): Promise<WasmModule> {
  if (wasmModule) {
    return wasmModule;
  }

  const hasSIMD = detectSIMD();
  const wasmFile = hasSIMD ? 'ruvector_simd.wasm' : 'ruvector.wasm';

  const possiblePaths = [
    join(process.cwd(), 'wasm', wasmFile),
    join(process.cwd(), '..', '..', 'wasm', wasmFile),
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'wasm', wasmFile),
    join(dirname(fileURLToPath(import.meta.url)), '..', 'wasm', wasmFile),
  ];

  let wasmBytes: Buffer | null = null;
  let loadedFrom = '';

  for (const path of possiblePaths) {
    try {
      wasmBytes = await readFile(path);
      loadedFrom = path;
      break;
    } catch {
      // Try next path
    }
  }

  if (!wasmBytes) {
    throw new Error(
      `Failed to load WASM module (${wasmFile}). ` +
      `Tried paths: ${possiblePaths.join(', ')}`
    );
  }

  // Initialize memory (16MB initial, 256MB max)
  wasmMemory = new WebAssembly.Memory({
    initial: 256,
    maximum: 4096,
    shared: false,
  });

  const importObject = {
    env: {
      memory: wasmMemory,
      abort: () => {
        throw new Error('WASM abort');
      },
    },
  };

  const { instance } = await WebAssembly.instantiate(wasmBytes, importObject);
  wasmModule = instance.exports as unknown as WasmModule;

  console.log(`Loaded WASM module from: ${loadedFrom} (SIMD: ${hasSIMD})`);

  return wasmModule;
}

/**
 * Helper to write data to WASM memory
 */
function writeToMemory(module: WasmModule, data: Uint8Array): [number, number] {
  const ptr = module.alloc(data.length);
  const memory = new Uint8Array(module.memory.buffer);
  memory.set(data, ptr);
  return [ptr, data.length];
}

/**
 * Helper to read data from WASM memory
 */
function readFromMemory(module: WasmModule, ptr: number, len: number): Uint8Array {
  const memory = new Uint8Array(module.memory.buffer);
  return memory.slice(ptr, ptr + len);
}

/**
 * Helper to serialize and write JSON to WASM
 */
function writeJSON(module: WasmModule, data: any): [number, number] {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  return writeToMemory(module, bytes);
}

/**
 * Helper to read and parse JSON from WASM
 */
function readJSON<T>(module: WasmModule, ptr: number, len: number): T {
  const bytes = readFromMemory(module, ptr, len);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

/**
 * Helper to write string to WASM
 */
function writeString(module: WasmModule, str: string): [number, number] {
  const bytes = new TextEncoder().encode(str);
  return writeToMemory(module, bytes);
}

/**
 * Create WASM-based bindings that match the NAPI interface
 */
export async function createWasmBindings(): Promise<NativeBindings> {
  const module = await loadWasmModule();

  return {
    // VectorDB operations
    async vectordb_new(options: DbOptions): Promise<number> {
      const [ptr, len] = writeJSON(module, options);
      const handle = module.vectordb_new(ptr, len);
      module.dealloc(ptr, len);
      return handle;
    },

    async vectordb_insert(handle: number, entry: VectorEntry): Promise<string> {
      const [ptr, len] = writeJSON(module, entry);
      const resultPtr = module.vectordb_insert(handle, ptr, len);
      module.dealloc(ptr, len);

      const resPtr = module.get_result_ptr();
      const resLen = module.get_result_len();
      const result = readJSON<{ id: string }>(module, resPtr, resLen);
      return result.id;
    },

    async vectordb_insert_batch(handle: number, entries: VectorEntry[]): Promise<string[]> {
      const [ptr, len] = writeJSON(module, entries);
      const resultPtr = module.vectordb_insert_batch(handle, ptr, len);
      module.dealloc(ptr, len);

      const resPtr = module.get_result_ptr();
      const resLen = module.get_result_len();
      return readJSON<string[]>(module, resPtr, resLen);
    },

    async vectordb_search(handle: number, query: SearchQuery): Promise<SearchResult[]> {
      const [ptr, len] = writeJSON(module, query);
      const resultPtr = module.vectordb_search(handle, ptr, len);
      module.dealloc(ptr, len);

      const resPtr = module.get_result_ptr();
      const resLen = module.get_result_len();
      return readJSON<SearchResult[]>(module, resPtr, resLen);
    },

    async vectordb_delete(handle: number, id: string): Promise<boolean> {
      const [ptr, len] = writeString(module, id);
      const result = module.vectordb_delete(handle, ptr, len);
      module.dealloc(ptr, len);
      return result === 1;
    },

    async vectordb_get(handle: number, id: string): Promise<VectorEntry | null> {
      const [ptr, len] = writeString(module, id);
      const resultPtr = module.vectordb_get(handle, ptr, len);
      module.dealloc(ptr, len);

      if (resultPtr === 0) return null;

      const resPtr = module.get_result_ptr();
      const resLen = module.get_result_len();
      return readJSON<VectorEntry>(module, resPtr, resLen);
    },

    async vectordb_len(handle: number): Promise<number> {
      return module.vectordb_len(handle);
    },

    async vectordb_close(handle: number): Promise<void> {
      module.vectordb_close(handle);
    },

    // HNSW Index operations
    async hnsw_create(dimensions: number, metric: DistanceMetric, config: HnswConfig): Promise<number> {
      const metricMap = { euclidean: 0, cosine: 1, dotproduct: 2, manhattan: 3 };
      const [ptr, len] = writeJSON(module, config);
      const handle = module.hnsw_create(dimensions, metricMap[metric], ptr, len);
      module.dealloc(ptr, len);
      return handle;
    },

    async hnsw_build(handle: number): Promise<void> {
      module.hnsw_build(handle);
    },

    async hnsw_add(handle: number, id: string, vector: number[]): Promise<void> {
      const [idPtr, idLen] = writeString(module, id);
      const [vecPtr, vecLen] = writeJSON(module, vector);
      module.hnsw_add(handle, idPtr, idLen, vecPtr, vecLen);
      module.dealloc(idPtr, idLen);
      module.dealloc(vecPtr, vecLen);
    },

    async hnsw_add_batch(handle: number, entries: Array<[string, number[]]>): Promise<void> {
      for (const [id, vector] of entries) {
        await this.hnsw_add!(handle, id, vector);
      }
    },

    async hnsw_search(handle: number, vector: number[], k: number, ef_search?: number): Promise<SearchResult[]> {
      const [ptr, len] = writeJSON(module, vector);
      const resultPtr = module.hnsw_search(handle, ptr, len, k, ef_search ?? 100);
      module.dealloc(ptr, len);

      const resPtr = module.get_result_ptr();
      const resLen = module.get_result_len();
      return readJSON<SearchResult[]>(module, resPtr, resLen);
    },

    async hnsw_remove(handle: number, id: string): Promise<boolean> {
      const [ptr, len] = writeString(module, id);
      const result = module.hnsw_remove(handle, ptr, len);
      module.dealloc(ptr, len);
      return result === 1;
    },

    async hnsw_stats(handle: number): Promise<{ layers: number; nodes: number; edges: number }> {
      const resultPtr = module.hnsw_stats(handle);
      const resPtr = module.get_result_ptr();
      const resLen = module.get_result_len();
      return readJSON(module, resPtr, resLen);
    },

    async hnsw_close(handle: number): Promise<void> {
      module.hnsw_close(handle);
    },

    // Collection operations
    async collection_manager_new(base_path: string): Promise<number> {
      const [ptr, len] = writeString(module, base_path);
      const handle = module.collection_manager_new(ptr, len);
      module.dealloc(ptr, len);
      return handle;
    },

    async collection_create(handle: number, name: string, config: CollectionConfig): Promise<void> {
      const [namePtr, nameLen] = writeString(module, name);
      const [configPtr, configLen] = writeJSON(module, config);
      module.collection_create(handle, namePtr, nameLen, configPtr, configLen);
      module.dealloc(namePtr, nameLen);
      module.dealloc(configPtr, configLen);
    },

    async collection_delete(handle: number, name: string): Promise<boolean> {
      const [ptr, len] = writeString(module, name);
      const result = module.collection_delete(handle, ptr, len);
      module.dealloc(ptr, len);
      return result === 1;
    },

    async collection_list(handle: number): Promise<string[]> {
      const resultPtr = module.collection_list(handle);
      const resPtr = module.get_result_ptr();
      const resLen = module.get_result_len();
      return readJSON<string[]>(module, resPtr, resLen);
    },

    async collection_get(handle: number, name: string): Promise<number | null> {
      const [ptr, len] = writeString(module, name);
      const result = module.collection_get(handle, ptr, len);
      module.dealloc(ptr, len);
      return result === 0 ? null : result;
    },

    async collection_exists(handle: number, name: string): Promise<boolean> {
      const result = await this.collection_get!(handle, name);
      return result !== null;
    },

    async collection_create_alias(handle: number, alias: string, collection: string): Promise<void> {
      // WASM implementation would need to be added to Rust side
      throw new Error('collection_create_alias not yet implemented in WASM');
    },

    async collection_delete_alias(handle: number, alias: string): Promise<boolean> {
      throw new Error('collection_delete_alias not yet implemented in WASM');
    },

    async collection_list_aliases(handle: number): Promise<Record<string, string>> {
      throw new Error('collection_list_aliases not yet implemented in WASM');
    },

    async collection_manager_close(handle: number): Promise<void> {
      // WASM cleanup if needed
    },

    // Cluster operations (limited support in WASM)
    async cluster_manager_new(): Promise<number> {
      throw new Error('Cluster operations not supported in WASM mode');
    },
    async cluster_add_node(): Promise<void> {
      throw new Error('Cluster operations not supported in WASM mode');
    },
    async cluster_remove_node(): Promise<void> {
      throw new Error('Cluster operations not supported in WASM mode');
    },
    async cluster_get_node(): Promise<ClusterNode | null> {
      throw new Error('Cluster operations not supported in WASM mode');
    },
    async cluster_list_nodes(): Promise<ClusterNode[]> {
      throw new Error('Cluster operations not supported in WASM mode');
    },
    async cluster_healthy_nodes(): Promise<ClusterNode[]> {
      throw new Error('Cluster operations not supported in WASM mode');
    },
    async cluster_assign_shard(): Promise<any> {
      throw new Error('Cluster operations not supported in WASM mode');
    },
    async cluster_get_stats(): Promise<any> {
      throw new Error('Cluster operations not supported in WASM mode');
    },
    async cluster_start(): Promise<void> {
      throw new Error('Cluster operations not supported in WASM mode');
    },
    async cluster_close(): Promise<void> {
      throw new Error('Cluster operations not supported in WASM mode');
    },

    // Consensus operations (limited support in WASM)
    async consensus_new(): Promise<number> {
      throw new Error('Consensus operations not supported in WASM mode');
    },
    async consensus_submit_transaction(): Promise<string> {
      throw new Error('Consensus operations not supported in WASM mode');
    },
    async consensus_finalize_vertex(): Promise<void> {
      throw new Error('Consensus operations not supported in WASM mode');
    },
    async consensus_get_finalized_order(): Promise<string[]> {
      throw new Error('Consensus operations not supported in WASM mode');
    },
    async consensus_is_finalized(): Promise<boolean> {
      throw new Error('Consensus operations not supported in WASM mode');
    },
    async consensus_close(): Promise<void> {
      throw new Error('Consensus operations not supported in WASM mode');
    },
  };
}

/**
 * Check if WASM is available
 */
export async function isWasmAvailable(): Promise<boolean> {
  try {
    await loadWasmModule();
    return true;
  } catch {
    return false;
  }
}

export default createWasmBindings;
