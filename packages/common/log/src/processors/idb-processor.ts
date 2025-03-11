//
// Copyright 2025 DXOS.org
//

import { type LogConfig } from '../config';
import { getLogRecordFromEntry, type LogEntry, type LogProcessor, type LogRecord } from '../context';
import { CircularBufferStorage, type CircularBufferOptions } from '../utils/circular-buffer-storage';

/**
 * Configuration for the IDB log processor.
 */
export interface IDBProcessorOptions {
  /**
   * Name of the IndexedDB database.
   */
  dbName: string;

  /**
   * Name of the object store for logs.
   */
  storeName: string;

  /**
   * Maximum size in bytes to store.
   * Set to 0 to disable size-based cleanup.
   * Note: This is an approximation as JavaScript objects don't have a fixed size.
   */
  maxSizeBytes: number;

  /**
   * Batch size before writing to IndexedDB.
   */
  batchSize: number;

  /**
   * Interval in milliseconds to flush pending logs if batch is not full.
   */
  flushInterval: number;

  /**
   * Time interval in milliseconds to perform garbage collection.
   */
  gcInterval: number;

  /**
   * Timeout for lock acquisition in milliseconds.
   * If a lock cannot be acquired within this time, the operation will proceed without a lock.
   */
  lockTimeout: number;
}

/**
 * Default options for the IDB processor.
 */
const DEFAULT_OPTIONS: IDBProcessorOptions = {
  dbName: 'dxos-logs',
  storeName: 'logs',
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  batchSize: 50,
  flushInterval: 10000, // 10 seconds
  gcInterval: 60000, // 1 minute
  lockTimeout: 5000, // 5 seconds
};

/**
 * Options for retrieving logs.
 */
export interface GetLogsOptions {
  /**
   * Start time in milliseconds since epoch.
   */
  startTime?: number;

  /**
   * End time in milliseconds since epoch.
   */
  endTime?: number;

  /**
   * Maximum number of entries to return.
   */
  limit?: number;

  /**
   * Sort direction.
   */
  direction?: 'asc' | 'desc';
}

/**
 * IDB processor stores logs in a circular buffer in IndexedDB.
 * Logs are batched for performance and old logs are automatically removed
 * based on count or size limits.
 */
export class IDBProcessor {
  private _options: IDBProcessorOptions;
  private _currentBatch: LogRecord[] = [];
  private _flushTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _buffer: CircularBufferStorage;
  private _pendingWrites: Promise<void> = Promise.resolve();

  /**
   * Creates a new IDB processor.
   */
  constructor(options: Partial<IDBProcessorOptions> = {}) {
    this._options = { ...DEFAULT_OPTIONS, ...options };

    // Initialize the circular buffer
    const bufferOptions: Partial<CircularBufferOptions> = {
      dbName: this._options.dbName,
      storeName: this._options.storeName,
      maxSizeBytes: this._options.maxSizeBytes,
      gcInterval: this._options.gcInterval,
      lockTimeout: this._options.lockTimeout,
    };

    this._buffer = new CircularBufferStorage(bufferOptions);
  }

  /**
   * Process a log entry.
   */
  async process(config: LogConfig, entry: LogEntry): Promise<void> {
    // Convert LogEntry to LogRecord
    const record = getLogRecordFromEntry(config, entry);

    // Add to current batch
    this._currentBatch.push(record);

    // Flush if batch is full
    if (this._currentBatch.length >= this._options.batchSize) {
      await this._flush();
    } else if (this._flushTimeoutId === null && this._currentBatch.length > 0) {
      // Set timeout to flush if not already set
      this._flushTimeoutId = setTimeout(() => this._flush(), this._options.flushInterval);
    }
  }

  /**
   * Flush current batch to IndexedDB.
   */
  private async _flush(): Promise<void> {
    if (this._flushTimeoutId) {
      clearTimeout(this._flushTimeoutId);
      this._flushTimeoutId = null;
    }

    if (this._currentBatch.length === 0) {
      return;
    }

    // JSON encode the batch
    const batch = [...this._currentBatch];
    this._currentBatch = [];

    // Serialize batch to JSON string
    const serializedBatch = JSON.stringify(batch);

    // Wait for any pending writes to complete
    await this._pendingWrites;

    // Write the batch
    this._pendingWrites = this._buffer
      .add(serializedBatch)
      .then(() => {})
      .catch((error) => {
        console.error('Failed to write log batch:', error);
      });

    return this._pendingWrites;
  }

  /**
   * Get log entries by time range.
   * @param options.direction=asc - Sort direction. 'desc' for newest first, 'asc' for oldest first.
   */
  async getLogs(options: GetLogsOptions = {}): Promise<LogRecord[]> {
    const serializedBatches = await this._buffer.getLogs(options);

    // Deserialize and flatten the batches
    const records: LogRecord[] = [];

    for (const serializedBatch of serializedBatches) {
      try {
        const batch = JSON.parse(serializedBatch) as LogRecord[];
        records.push(...batch);
      } catch (error) {
        console.error('Failed to parse log batch:', error);
      }
    }

    const direction = options.direction ?? 'asc';

    // Sort by timestamp according to requested direction
    if (direction === 'desc') {
      records.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      records.sort((a, b) => a.timestamp - b.timestamp);
    }

    return records.slice(0, options.limit);
  }

  /**
   * Clean up resources.
   */
  async dispose(): Promise<void> {
    if (this._flushTimeoutId) {
      clearTimeout(this._flushTimeoutId);
      this._flushTimeoutId = null;
    }

    // Flush any remaining logs
    if (this._currentBatch.length > 0) {
      await this._flush();
    }

    // Wait for pending writes
    await this._pendingWrites;

    // Dispose the buffer
    await this._buffer.dispose();
  }
}

/**
 * Factory function to create an IDB processor.
 * This implements the singleton pattern to ensure only one processor exists
 * per database/store combination.
 */
export const createIDBProcessor = (options?: Partial<IDBProcessorOptions>): LogProcessor => {
  const processor = new IDBProcessor(options);
  const processorFn = (config: LogConfig, entry: LogEntry) => {
    void processor.process(config, entry);
  };

  return processorFn;
};
