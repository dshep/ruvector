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
    /**
     * Open an existing store read-only. Nothing reaches its file: search, get,
     * len and isEmpty work as usual, and insert, insertBatch and delete reject
     * with "the database is open read-only". A file that does not exist, is
     * empty or has no vector tables is refused with an error starting "no
     * vector store at" and naming it; nothing is created. Takes a shared lock:
     * read-only opens coexist and share only with each other. A read-only open
     * is refused while this process or another holds the file writable, and a
     * writable open while this process or another holds it read-only, each
     * with "Database already open. Cannot acquire lock."
     */
    readOnly?: boolean;
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
   * Release this handle's hold on the database. Calls issued before close()
   * finish normally; calls issued after it reject with "the database is
   * closed". The promise resolves once the earlier calls have finished, without
   * blocking the JS thread; it waits as long as they take. Handles of one mode
   * on one file in this process share its database, and the file lock is
   * released when the last of them closes: only then can the file be opened in
   * the other mode. A second call resolves no earlier than the first.
   */
  close(): Promise<void>;
}

/** The engine crate's version, not this package's. */
export function version(): string;
