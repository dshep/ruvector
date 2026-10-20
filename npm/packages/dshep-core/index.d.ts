export interface VectorEntry {
  id?: string;
  vector: Float32Array | number[];
  /** JSON text; the engine stores and returns it as text. */
  metadata?: string;
}

export interface SearchQuery {
  vector: Float32Array | number[];
  k: number;
  efSearch?: number;
  /** JSON text naming the metadata fields to match. */
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
  /** Release the database and its file lock once calls issued before it finish; later calls fail. A second call does nothing. */
  close(): void;
}

/** The engine crate's version, not this package's. */
export function version(): string;
