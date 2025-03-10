//
// Copyright 2025 DXOS.org
//

import { type LogEntry, type LogProcessor } from '../context';
import { type LogConfig } from '../config';
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
   * Maximum number of log batches to keep.
   * Set to 0 to disable count-based cleanup.
   */
  maxBatches: number;

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
   * Time interval in milliseconds to recalculate the total size.
   * This ensures consistency when multiple instances are writing to the same store.
   */
  recalculationInterval: number;

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
  maxBatches: 1000,
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  batchSize: 50,
  flushInterval: 10000, // 10 seconds
  recalculationInterval: 60000, // 1 minute
  lockTimeout: 5000, // 5 seconds
};

/**
 * Structure for a log batch entry in IndexedDB.
 */
interface LogBatch {
  id: number;
  timestamp: number;
  logs: LogEntry[];
  approximateSize: number;
  instanceId?: string; // Track which instance created this batch
}

/**
 * Structure for a lock entry in IndexedDB.
 */
interface LockEntry {
  id: string;
  operation: string;
  instanceId: string;
  timestamp: number;
  expiresAt: number;
}

// Track instances by database and store name
const instanceMap = new Map<string, IDBProcessor>();

// Generate a unique instance ID
const generateInstanceId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * IDB processor stores logs in a circular buffer in IndexedDB.
 * Logs are batched for performance and old logs are automatically removed
 * based on count or size limits.
 */
export class IDBProcessor {
  private _options: IDBProcessorOptions;
  private _currentBatch: LogEntry[] = [];
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
      maxEntries: this._options.maxBatches,
      maxSizeBytes: this._options.maxSizeBytes,
      recalculationInterval: this._options.recalculationInterval,
      lockTimeout: this._options.lockTimeout,
    };

    this._buffer = new CircularBufferStorage(bufferOptions);
  }

  /**
   * Process a log entry.
   */
  async process(config: LogConfig, entry: LogEntry): Promise<void> {
    // Add to current batch
    this._currentBatch.push(entry);

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
   *
   * @param startTime Start timestamp (ms since epoch)
   * @param endTime End timestamp (ms since epoch)
   * @param limit Maximum number of log entries to return
   * @returns Array of log entries
   */
  async getLogs(startTime: number, endTime: number, limit = 100): Promise<LogEntry[]> {
    const serializedBatches = await this._buffer.getRange(startTime, endTime, limit);

    // Deserialize and flatten the batches
    const logs: LogEntry[] = [];

    for (const serializedBatch of serializedBatches) {
      try {
        const batch = JSON.parse(serializedBatch) as LogEntry[];
        logs.push(...batch);
      } catch (error) {
        console.error('Failed to parse log batch:', error);
      }
    }

    // Sort by timestamp if available
    logs.sort((a, b) => {
      const aTime = getTimestamp(a);
      const bTime = getTimestamp(b);
      return aTime - bTime;
    });

    return logs.slice(0, limit);
  }

  /**
   * Get the most recent log entries.
   *
   * @param limit Maximum number of log entries to return
   * @returns Array of log entries
   */
  async getRecentLogs(limit = 100): Promise<LogEntry[]> {
    const serializedBatches = await this._buffer.getRecent(Math.ceil(limit / this._options.batchSize));

    // Deserialize and flatten the batches
    const logs: LogEntry[] = [];

    for (const serializedBatch of serializedBatches) {
      try {
        const batch = JSON.parse(serializedBatch) as LogEntry[];
        logs.push(...batch);
      } catch (error) {
        console.error('Failed to parse log batch:', error);
      }
    }

    // Sort by timestamp if available and take the most recent
    logs.sort((a, b) => {
      const aTime = getTimestamp(a);
      const bTime = getTimestamp(b);
      return bTime - aTime; // Descending order
    });

    return logs.slice(0, limit);
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

    // Remove this instance from the map
    const dbStoreKey = `${this._options.dbName}:${this._options.storeName}`;
    if (instanceMap.get(dbStoreKey) === this) {
      instanceMap.delete(dbStoreKey);
    }
  }
}

/**
 * Factory function to create an IDB processor.
 * This implements the singleton pattern to ensure only one processor exists
 * per database/store combination.
 */
export const createIDBProcessor = (options?: Partial<IDBProcessorOptions>): LogProcessor => {
  const dbName = options?.dbName || DEFAULT_OPTIONS.dbName;
  const storeName = options?.storeName || DEFAULT_OPTIONS.storeName;
  const dbStoreKey = `${dbName}:${storeName}`;

  // Reuse existing instance if available
  if (!instanceMap.has(dbStoreKey)) {
    instanceMap.set(dbStoreKey, new IDBProcessor(options));
  }

  const processor = instanceMap.get(dbStoreKey)!;
  const processorFn = (config: LogConfig, entry: LogEntry) => {
    void processor.process(config, entry);
  };

  // Expose the processor instance and helper functions for testing
  if (process.env.NODE_ENV === 'test') {
    (processorFn as any).__processor = processor;
  }

  return processorFn;
};

/**
 * Extract a timestamp from a log entry.
 * Tries to use meta data if available, or falls back to current time.
 */
export function getTimestamp(entry: LogEntry): number {
  if (entry.meta && 'T' in entry.meta) {
    return (entry.meta as Record<string, any>)['T'] as number;
  }
  return Date.now(); // Fallback
}
