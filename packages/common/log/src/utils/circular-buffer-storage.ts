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
   * Maximum number of entries to keep.
   * Set to 0 to disable count-based cleanup.
   */
  maxEntries: number;

  /**
   * Maximum size in bytes to store.
   * Set to 0 to disable size-based cleanup.
   */
  maxSizeBytes: number;

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
 * Default options for the circular buffer storage.
 */
const DEFAULT_OPTIONS: CircularBufferOptions = {
  dbName: 'circular-buffer',
  storeName: 'entries',
  maxEntries: 1000,
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  recalculationInterval: 60000, // 1 minute
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
  private _totalSize = 0;
  private _ready: Promise<void>;
  private _instanceId: string;
  private _recalculationIntervalId: ReturnType<typeof setInterval> | null = null;
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

    await new Promise((resolve, reject) => {
      const request = indexedDB.open(this._options.dbName, 1);

      request.onerror = (event) => {
        console.error('Failed to open IndexedDB:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };

      request.onsuccess = (event) => {
        this._db = (event.target as IDBOpenDBRequest).result;

        // Set up periodic recalculation for better accuracy with multiple instances
        this._recalculationIntervalId = setInterval(() => {
          void this._recalculateTotalSize();
        }, this._options.recalculationInterval);

        // Perform initial size calculation
        this._recalculateTotalSize().then(resolve).catch(reject);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create entries object store if needed
        if (!db.objectStoreNames.contains(this._options.storeName)) {
          const store = db.createObjectStore(this._options.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
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

    // Generate a unique ID with timestamp + random component
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const entryId = timestamp * 1000 + random;

    // Calculate the size of the data
    const size = new Blob([data]).size;

    const entry: BufferEntry = {
      id: entryId,
      timestamp,
      data,
      size,
      instanceId: this._instanceId,
    };

    // Wait for any pending operations
    await this._pendingOperations;

    // Add entry with lock and enforce retention policy
    this._pendingOperations = this._withLock('write', async () => {
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

          transaction.oncomplete = async () => {
            this._totalSize += entry.size;
            await this._enforceRetentionPolicy();
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
    });

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
   * Get multiple entries by timestamp range.
   */
  async getRange(startTimestamp: number, endTimestamp: number, limit = 100): Promise<string[]> {
    await this._ready;

    if (!this._db) {
      throw new Error('IndexedDB is not available');
    }

    return new Promise<string[]>((resolve, reject) => {
      try {
        const db = this._db;
        if (!db) {
          resolve([]);
          return;
        }

        const transaction = db.transaction(this._options.storeName, 'readonly');
        const store = transaction.objectStore(this._options.storeName);
        const index = store.index('timestamp');

        const range = IDBKeyRange.bound(startTimestamp, endTimestamp);
        const results: string[] = [];

        const request = index.openCursor(range);

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

          if (cursor && results.length < limit) {
            const entry = cursor.value as BufferEntry;
            results.push(entry.data);
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
   * Get the most recent entries.
   */
  async getRecent(limit = 100): Promise<string[]> {
    await this._ready;

    if (!this._db) {
      throw new Error('IndexedDB is not available');
    }

    return new Promise<string[]>((resolve, reject) => {
      try {
        const db = this._db;
        if (!db) {
          resolve([]);
          return;
        }

        const transaction = db.transaction(this._options.storeName, 'readonly');
        const store = transaction.objectStore(this._options.storeName);
        const index = store.index('timestamp');

        const results: string[] = [];

        const request = index.openCursor(null, 'prev');

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

          if (cursor && results.length < limit) {
            const entry = cursor.value as BufferEntry;
            results.push(entry.data);
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
      // First, check if we need to remove entries based on count
      if (this._options.maxEntries > 0) {
        await this._removeOldEntriesByCount();
      }

      // Then, check if we need to remove entries based on size
      if (this._options.maxSizeBytes > 0 && this._totalSize > this._options.maxSizeBytes) {
        await this._removeOldEntriesBySize();
      }
    } catch (error) {
      console.error('Error enforcing retention policy:', error);
    }
  }

  /**
   * Remove old entries based on count limit.
   */
  private async _removeOldEntriesByCount(): Promise<void> {
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

          const transaction = db.transaction(this._options.storeName, 'readwrite');
          const store = transaction.objectStore(this._options.storeName);
          const index = store.index('timestamp');

          // Get count of entries
          const countRequest = store.count();

          countRequest.onsuccess = () => {
            const count = countRequest.result;
            if (count <= this._options.maxEntries) {
              resolve();
              return;
            }

            // Calculate how many to remove
            const toRemove = count - this._options.maxEntries;

            // Get the oldest entries
            const cursorRequest = index.openCursor();
            let removed = 0;

            cursorRequest.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
              if (cursor && removed < toRemove) {
                const entry = cursor.value as BufferEntry;
                this._totalSize -= entry.size;
                store.delete(cursor.primaryKey);
                removed++;
                cursor.continue();
              }
            };
          };

          transaction.oncomplete = () => {
            resolve();
          };

          transaction.onerror = (event) => {
            reject((event.target as IDBRequest).error);
          };
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Remove old entries based on size limit.
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

          const transaction = db.transaction(this._options.storeName, 'readwrite');
          const store = transaction.objectStore(this._options.storeName);
          const index = store.index('timestamp');

          // Calculate how many bytes to remove
          const bytesToRemove = this._totalSize - this._options.maxSizeBytes;
          let removedBytes = 0;

          // Get the oldest entries
          const cursorRequest = index.openCursor();

          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
            if (cursor && removedBytes < bytesToRemove) {
              const entry = cursor.value as BufferEntry;

              this._totalSize -= entry.size;
              removedBytes += entry.size;

              store.delete(cursor.primaryKey);
              cursor.continue();
            }
          };

          transaction.oncomplete = () => {
            resolve();
          };

          transaction.onerror = (event) => {
            reject((event.target as IDBRequest).error);
          };
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Recalculate total size of all entries in the database.
   * This is called periodically to ensure consistency when multiple instances are active.
   */
  private async _recalculateTotalSize(): Promise<void> {
    if (!this._db) return;

    return this._withLock('recalculate', async () => {
      await this._calculateTotalSize();
    });
  }

  /**
   * Calculate total size of all entries in the database.
   */
  private async _calculateTotalSize(): Promise<void> {
    if (!this._db) return;

    return new Promise((resolve, reject) => {
      try {
        const db = this._db;
        if (!db) {
          resolve();
          return;
        }

        const transaction = db.transaction(this._options.storeName, 'readonly');
        const store = transaction.objectStore(this._options.storeName);

        let totalSize = 0;

        const cursorRequest = store.openCursor();

        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor) {
            const entry = cursor.value as BufferEntry;
            totalSize += entry.size;
            cursor.continue();
          }
        };

        transaction.oncomplete = () => {
          this._totalSize = totalSize;
          resolve();
        };

        transaction.onerror = (event) => reject((event.target as IDBRequest).error);
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
   * Clean up resources.
   */
  async dispose(): Promise<void> {
    try {
      await this._ready;
    } catch {}

    if (this._recalculationIntervalId) {
      clearInterval(this._recalculationIntervalId);
      this._recalculationIntervalId = null;
    }

    // Wait for pending operations
    await this._pendingOperations;

    // Close the database
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  }
}

export const createCircularBuffer = (options?: Partial<CircularBufferOptions>): CircularBufferStorage => {
  return new CircularBufferStorage(options);
};
