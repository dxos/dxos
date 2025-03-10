//
// Copyright 2025 DXOS.org
//

/**
 * Configuration for the circular buffer storage.
 */
export interface CircularBufferOptions {
  /**
   * Name of the IndexedDB database.
   */
  dbName: string;

  /**
   * Name of the object store for data.
   */
  storeName: string;

  /**
   * Maximum size in bytes to store.
   * Set to 0 to disable size-based cleanup.
   */
  maxSizeBytes: number;

  /**
   * Timeout for lock acquisition in milliseconds.
   * If a lock cannot be acquired within this time, the operation will proceed without a lock.
   */
  lockTimeout: number;
}

/**
 * Default options for the circular buffer storage.
 */
const DEFAULT_OPTIONS: CircularBufferOptions = {
  dbName: 'circular-buffer',
  storeName: 'entries',
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  lockTimeout: 5000, // 5 seconds
};

/**
 * Structure for an entry in the buffer.
 */
interface BufferEntry {
  id: number;
  timestamp: number;
  data: string;
  size: number;
  instanceId: string;
}

/**
 * Options for retrieving logs from the circular buffer.
 */
export interface GetLogsOptions {
  /**
   * Only return logs with timestamps after this value (inclusive).
   */
  after?: number;

  /**
   * Only return logs with timestamps before this value (inclusive).
   */
  before?: number;

  /**
   * Maximum number of logs to return.
   */
  limit?: number;

  /**
   * Direction to retrieve logs.
   * - 'asc': Oldest first (ascending by ID/timestamp)
   * - 'desc': Newest first (descending by ID/timestamp)
   * Default is 'desc' (newest first).
   */
  direction?: 'asc' | 'desc';
}

// Generate a unique instance ID
const generateInstanceId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * A circular buffer implemented using IndexedDB.
 * Automatically removes old entries when the buffer reaches capacity.
 * Uses Web Locks API for cross-tab coordination.
 */
export class CircularBufferStorage {
  private _options: CircularBufferOptions;
  private _db: IDBDatabase | null = null;
  private _ready: Promise<void>;
  private _instanceId: string;
  private _pendingOperations: Promise<unknown> = Promise.resolve();
  private _webLocksSupported: boolean;

  /**
   * Creates a new circular buffer storage.
   */
  constructor(options: Partial<CircularBufferOptions> = {}) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._instanceId = generateInstanceId();
    this._webLocksSupported = this._checkWebLocksSupport();
    this._ready = this._initialize();
  }

  get dbName() {
    return this._options.dbName;
  }

  /**
   * Check if Web Locks API is supported in the current environment.
   */
  private _checkWebLocksSupport(): boolean {
    return typeof navigator !== 'undefined' && 'locks' in navigator && typeof navigator.locks?.request === 'function';
  }

  /**
   * Initialize the database connection.
   */
  private async _initialize(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      console.warn('IndexedDB is not available in this environment. CircularBufferStorage will not work.');
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this._options.dbName, 1);

      request.onerror = (event) => {
        console.error('Failed to open IndexedDB:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };

      request.onsuccess = (event) => {
        this._db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create entries object store if needed
        if (!db.objectStoreNames.contains(this._options.storeName)) {
          // Use autoIncrement for id to maintain chronological order
          const store = db.createObjectStore(this._options.storeName, { keyPath: 'id', autoIncrement: true });
          // No need for timestamp index as IDs are already in insertion order
        }
      };
    });

    console.log('Initialized circular buffer', this._options.dbName, this._options.storeName);
  }

  /**
   * Adds a string to the circular buffer.
   * Returns the ID of the newly added entry.
   */
  async add(data: string): Promise<number> {
    // Ensure we wait for initialization
    await this._ready;

    if (!this._db) {
      throw new Error('IndexedDB is not available');
    }

    // Calculate the size of the data
    const size = new Blob([data]).size;

    const entry: Omit<BufferEntry, 'id'> = {
      timestamp: Date.now(),
      data,
      size,
      instanceId: this._instanceId,
    };

    // Wait for any pending operations
    await this._pendingOperations;

    // Add entry directly without a lock (IndexedDB already provides transaction-level locking)
    let entryId = 0;
    this._pendingOperations = (async () => {
      if (!this._db) return;

      await new Promise<void>((resolve, reject) => {
        try {
          const db = this._db;
          if (!db) {
            resolve();
            return;
          }

          const transaction = db.transaction(this._options.storeName, 'readwrite');
          const store = transaction.objectStore(this._options.storeName);

          const request = store.add(entry);

          request.onsuccess = (event) => {
            entryId = (event.target as IDBRequest).result as number;
          };

          transaction.oncomplete = async () => {
            // Enforce retention policy after adding new entry, this operation does need a lock
            await this.performGarbageCollection();
            resolve();
          };

          transaction.onerror = (event) => {
            console.error('Error writing entry:', (event.target as IDBRequest).error);
            reject((event.target as IDBRequest).error);
          };
        } catch (error) {
          console.error('Failed to write entry:', error);
          reject(error);
        }
      });
    })();

    await this._pendingOperations;
    return entryId;
  }

  /**
   * Get an entry by ID.
   */
  async get(id: number): Promise<string | null> {
    await this._ready;

    if (!this._db) {
      throw new Error('IndexedDB is not available');
    }

    return new Promise<string | null>((resolve, reject) => {
      try {
        const db = this._db;
        if (!db) {
          resolve(null);
          return;
        }

        const transaction = db.transaction(this._options.storeName, 'readonly');
        const store = transaction.objectStore(this._options.storeName);

        const request = store.get(id);

        request.onsuccess = () => {
          const entry = request.result as BufferEntry;
          resolve(entry ? entry.data : null);
        };

        request.onerror = (event) => {
          reject((event.target as IDBRequest).error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get entries based on provided options.
   */
  async getLogs(options: GetLogsOptions = {}): Promise<string[]> {
    await this._ready;

    if (!this._db) {
      throw new Error('IndexedDB is not available');
    }

    const { after, before, limit = 100, direction = 'desc' } = options;

    return new Promise<string[]>((resolve, reject) => {
      try {
        const db = this._db;
        if (!db) {
          resolve([]);
          return;
        }

        const transaction = db.transaction(this._options.storeName, 'readonly');
        const store = transaction.objectStore(this._options.storeName);
        const results: string[] = [];

        // Use primary key ordering based on direction
        const cursorDirection: IDBCursorDirection = direction === 'desc' ? 'prev' : 'next';
        const request = store.openCursor(null, cursorDirection);

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

          if (cursor) {
            const entry = cursor.value as BufferEntry;

            // Apply timestamp filters if provided
            const afterCheck = after === undefined || entry.timestamp >= after;
            const beforeCheck = before === undefined || entry.timestamp <= before;

            if (afterCheck && beforeCheck) {
              if (results.length < limit) {
                results.push(entry.data);
              } else {
                resolve(results);
                return;
              }
            }

            cursor.continue();
          } else {
            resolve(results);
          }
        };

        request.onerror = (event) => {
          reject((event.target as IDBRequest).error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Enforce retention policy by removing old entries.
   */
  private async _enforceRetentionPolicy(): Promise<void> {
    if (!this._db) return;

    try {
      // Check if we need to remove entries based on size
      if (this._options.maxSizeBytes > 0) {
        await this._removeOldEntriesBySize();
      }
    } catch (error) {
      console.error('Error enforcing retention policy:', error);
    }
  }

  /**
   * Remove old entries based on size limit using a single-pass algorithm.
   * This calculates the total size while identifying entries that should be kept
   * within the size budget, then removes older entries in a batch operation.
   */
  private async _removeOldEntriesBySize(): Promise<void> {
    if (!this._db) return;

    return this._withLock('cleanup', async () => {
      if (!this._db) return;

      await new Promise<void>((resolve, reject) => {
        try {
          const db = this._db;
          if (!db) {
            resolve();
            return;
          }

          // First transaction: Read-only to collect information
          const readTx = db.transaction(this._options.storeName, 'readonly');
          const readStore = readTx.objectStore(this._options.storeName);

          // Array to store entries in reverse order (newest first)
          // We'll accumulate entries until we reach the size budget
          const entries: { id: number; size: number }[] = [];
          let totalSize = 0;
          let deletionThresholdId = -1;

          // Get all entries in reverse order (newest first)
          const request = readStore.openCursor(null, 'prev');

          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
            if (cursor) {
              const entry = cursor.value as BufferEntry;

              // Add this entry to our calculation
              entries.push({ id: entry.id, size: entry.size });
              totalSize += entry.size;

              // Check if we've collected enough entries to determine what to keep
              if (totalSize > this._options.maxSizeBytes && deletionThresholdId === -1) {
                // We've crossed the threshold, all entries with ID less than the last one
                // that fit within budget can be deleted
                for (let i = entries.length - 1; i >= 0; i--) {
                  totalSize -= entries[i].size;
                  if (totalSize <= this._options.maxSizeBytes) {
                    deletionThresholdId = entries[i].id;
                    break;
                  }
                }

                // If we couldn't find a threshold (rare edge case), we'll delete nothing
                if (deletionThresholdId === -1) {
                  deletionThresholdId = 0; // Keep everything
                }

                // No need to continue scanning once we've found our threshold
                resolve();
                return;
              }

              cursor.continue();
            } else {
              // If we've gone through all entries and are still under budget, no deletion needed
              if (totalSize <= this._options.maxSizeBytes) {
                resolve();
                return;
              }

              // If we haven't set a threshold but we're over budget,
              // we need to delete the oldest entries
              if (deletionThresholdId === -1) {
                deletionThresholdId = entries[entries.length - 1].id;
              }

              resolve();
            }
          };

          request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
          };

          // After the read transaction completes, perform the deletion if needed
          readTx.oncomplete = () => {
            if (deletionThresholdId <= 0) {
              // Nothing to delete
              resolve();
              return;
            }

            // Second transaction: Delete entries with ID less than the threshold
            const writeTx = db.transaction(this._options.storeName, 'readwrite');
            const writeStore = writeTx.objectStore(this._options.storeName);

            // Use IDBKeyRange to efficiently delete all entries with ID < deletionThresholdId
            const range = IDBKeyRange.upperBound(deletionThresholdId, true); // Exclude the threshold ID
            const deleteRequest = writeStore.delete(range);

            deleteRequest.onerror = (event) => {
              reject((event.target as IDBRequest).error);
            };

            writeTx.oncomplete = () => {
              resolve();
            };

            writeTx.onerror = (event) => {
              reject((event.target as IDBRequest).error);
            };
          };

          readTx.onerror = (event) => {
            reject((event.target as IDBRequest).error);
          };
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Calculate the current total size of all entries.
   * @returns The total size in bytes.
   */
  private async _calculateCurrentSize(): Promise<number> {
    if (!this._db) return 0;

    return new Promise<number>((resolve, reject) => {
      try {
        const db = this._db;
        if (!db) {
          resolve(0);
          return;
        }

        const transaction = db.transaction(this._options.storeName, 'readonly');
        const store = transaction.objectStore(this._options.storeName);
        let totalSize = 0;

        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor) {
            const entry = cursor.value as BufferEntry;
            totalSize += entry.size;
            cursor.continue();
          } else {
            resolve(totalSize);
          }
        };

        request.onerror = (event) => {
          reject((event.target as IDBRequest).error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Execute a function with a Web Lock when possible.
   * Uses the Web Locks API if available, otherwise executes the function directly.
   * Will fall back to direct execution if lock acquisition times out.
   *
   * @param lockName Name of the lock to acquire
   * @param fn Function to execute with the lock
   * @returns Result of the function
   */
  private async _withLock<T>(lockName: string, fn: () => Promise<T>): Promise<T> {
    // If Web Locks API is not supported, just run the function
    if (!this._webLocksSupported) {
      console.debug('Web Locks API not supported, running without locks');
      return fn();
    }

    // Create a unique lock name for this database and store
    const fullLockName = `${this._options.dbName}:${this._options.storeName}:${lockName}`;

    try {
      // Try to acquire the lock with a timeout
      return new Promise<T>((resolve, reject) => {
        let isResolved = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        // Set a timeout for lock acquisition
        timeoutId = setTimeout(() => {
          if (!isResolved) {
            console.warn(`Lock acquisition timed out for ${fullLockName}, proceeding without lock`);
            isResolved = true;
            // Run the function without a lock
            fn().then(resolve).catch(reject);
          }
        }, this._options.lockTimeout);

        // Try to acquire the lock
        navigator.locks
          .request(fullLockName, { mode: 'exclusive' }, async () => {
            // Clear the timeout if we got the lock
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }

            // If the timeout already happened, don't execute twice
            if (isResolved) return;

            isResolved = true;

            try {
              const result = await fn();
              resolve(result);
              return result;
            } catch (err) {
              reject(err);
              throw err;
            }
          })
          .catch((error) => {
            // Web Locks API error
            console.error(`Error with Web Locks API: ${error}`);

            // If the timeout already happened, don't execute twice
            if (isResolved) return;

            isResolved = true;

            // Clear the timeout
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }

            // Run without lock
            fn().then(resolve).catch(reject);
          });
      });
    } catch (error) {
      console.error(`Error with Web Locks API, proceeding without lock: ${error}`);
      return fn();
    }
  }

  /**
   * Force garbage collection by manually enforcing the retention policy.
   * This is primarily useful for testing.
   * @returns A promise that resolves when garbage collection is complete.
   */
  async performGarbageCollection(): Promise<void> {
    await this._ready;
    return this._withLock('manual-gc', async () => {
      await this._enforceRetentionPolicy();
    });
  }

  /**
   * Dispose of the circular buffer.
   */
  async dispose(): Promise<void> {
    // Make sure we are initialized before disposing to avoid race condition
    try {
      await this._ready;
    } catch (error) {
      console.error('Error disposing circular buffer:', error);
    }

    // Wait for any pending operations
    await this._pendingOperations;

    // Clear recalculation interval
    if (this._db) {
      try {
        this._db.close();
      } catch (error) {
        console.error('Error closing IndexedDB:', error);
      }
      this._db = null;
    }
  }
}

export const createCircularBuffer = (options?: Partial<CircularBufferOptions>): CircularBufferStorage => {
  return new CircularBufferStorage(options);
};
