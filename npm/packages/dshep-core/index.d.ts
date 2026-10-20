export interface VectorEntry {
  id?: string;
  vector: Float32Array | number[];
  /**
   * JSON text of an object. The engine parses it and returns it re-serialized,
   * so whitespace and key order may differ. Text that is not a JSON object is
   * dropped without an error: the entry is stored with no metadata.
   */
  metadata?: string;
}

export interface SearchQuery {
  vector: Float32Array | number[];
  k: number;
  efSearch?: number;
  /**
   * JSON text of an object naming the metadata fields to match. Text that is
   * not a JSON object is ignored without an error: the search runs unfiltered.
   */
  filter?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  vector?: Float32Array;
  metadata?: string;
}

export class VectorDb {
  constructor(options: {
    dimensions: number;
    storagePath?: string;
    distanceMetric?: string;
    hnswConfig?: unknown;
    quantization?: unknown;
  });
  static withDimensions(dimensions: number): VectorDb;
  insert(entry: VectorEntry): Promise<string>;
  insertBatch(entries: VectorEntry[]): Promise<string[]>;
  search(query: SearchQuery): Promise<SearchResult[]>;
  delete(id: string): Promise<boolean>;
  get(id: string): Promise<VectorEntry | null>;
  len(): Promise<number>;
  isEmpty(): Promise<boolean>;
  /**
   * Release the database and its file lock. Calls issued before close() finish
   * normally; calls issued after it reject with "the database is closed". The
   * promise resolves once the earlier calls have finished and the file is
   * released, without blocking the JS thread; it waits as long as they take.
   * A second call resolves no earlier than the first.
   */
  close(): Promise<void>;
}

/** The engine crate's version, not this package's. */
export function version(): string;
