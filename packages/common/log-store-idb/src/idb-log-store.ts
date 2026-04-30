//
// Copyright 2026 DXOS.org
//

import {
  type LogConfig,
  type LogEntry,
  type LogProcessor,
  inferEnvironmentName,
  serializeToJsonl,
} from '@dxos/log';

import { trimJsonlToSize } from './trim';

const DEFAULT_STORE_NAME = 'logs';
const DEFAULT_FLUSH_INTERVAL = 250;
const DEFAULT_FLUSH_BATCH_SIZE = 500;
// Sized for ~50 MB on disk at the observed Composer average of ~350 bytes per JSONL line.
// Adjust `maxRecords` if your workload's per-entry size differs significantly.
const DEFAULT_MAX_RECORDS = 150_000;
const DEFAULT_EVICTION_INTERVAL = 30_000;
const EVICTION_LOCK_NAME = '@dxos/log-store-idb:evictor';

/**
 * Stored log row. The line is pre-encoded JSONL (no trailing newline).
 */
type LogRow = {
  /** Auto-incremented sequence (commit order). */
  seq?: number;
  /** Encoded JSONL line. */
  line: string;
};

export type IdbLogStoreOptions = {
  /** Name of the IndexedDB database. */
  dbName: string;
  /** Object store name. Default `'logs'`. */
  storeName?: string;
  /** Auto-flush interval in milliseconds. Default `250`. */
  flushInterval?: number;
  /** Auto-flush when in-memory queue reaches this size. Default `500`. */
  flushBatchSize?: number;
  /**
   * Soft cap on retained records. Older rows are evicted past this. Default `150_000`,
   * sized for roughly 50 MB on disk at typical JSONL line sizes (~350 bytes average
   * observed in the Composer app).
   */
  maxRecords?: number;
  /** Eviction sweep interval in milliseconds. Default `30_000`. */
  evictionInterval?: number;
  /**
   * Identifier embedded in every record's `i` field.
   * Defaults to a scope-aware id of the form `<scope>:<name>:<suffix>` — see {@link inferEnvironmentName}.
   */
  tabId?: string;
};

/**
 * IndexedDB-backed log store.
 *
 * Logs are batched in memory and flushed to IndexedDB as pre-encoded JSONL strings.
 * Multiple browsing contexts can write to the same database concurrently — IDB
 * serializes transactions, so no extra coordination is needed for writes.
 * Eviction is deduplicated across tabs via the Web Locks API (`ifAvailable`).
 *
 * Flushes are triggered by:
 * - the configured interval timer,
 * - the queue exceeding `flushBatchSize`,
 * - `visibilitychange` to `hidden` and `pagehide` events.
 */
export class IdbLogStore {
  readonly #dbName: string;
  readonly #storeName: string;
  readonly #flushInterval: number;
  readonly #flushBatchSize: number;
  readonly #maxRecords: number;
  readonly #evictionInterval: number;
  readonly #tabId: string;

  #queue: string[] = [];
  #flushTimer: ReturnType<typeof setTimeout> | undefined;
  #evictionTimer: ReturnType<typeof setInterval> | undefined;
  #pendingFlush: Promise<void> | undefined;
  #db: IDBDatabase | undefined;
  #dbPromise: Promise<IDBDatabase> | undefined;
  #closed = false;
  #pageHideHandler: (() => void) | undefined;
  #visibilityHandler: (() => void) | undefined;

  constructor(options: IdbLogStoreOptions) {
    this.#dbName = options.dbName;
    this.#storeName = options.storeName ?? DEFAULT_STORE_NAME;
    this.#flushInterval = options.flushInterval ?? DEFAULT_FLUSH_INTERVAL;
    this.#flushBatchSize = options.flushBatchSize ?? DEFAULT_FLUSH_BATCH_SIZE;
    this.#maxRecords = options.maxRecords ?? DEFAULT_MAX_RECORDS;
    this.#evictionInterval = options.evictionInterval ?? DEFAULT_EVICTION_INTERVAL;
    this.#tabId = options.tabId ?? inferEnvironmentName();

    this.#installLifecycleHandlers();
    this.#scheduleEviction();
  }

  /**
   * Log processor — register via `log.addProcessor(store.processor)`.
   */
  readonly processor: LogProcessor = (_config: LogConfig, entry: LogEntry) => {
    if (this.#closed) {
      return;
    }
    const line = serializeToJsonl(entry, { env: this.#tabId });
    if (line === undefined) {
      return;
    }
    this.#queue.push(line);

    if (this.#queue.length >= this.#flushBatchSize) {
      void this.flush();
    } else if (this.#flushTimer === undefined) {
      this.#flushTimer = setTimeout(() => {
        this.#flushTimer = undefined;
        void this.flush();
      }, this.#flushInterval);
    }
  };

  /**
   * Force a flush now and resolve once the IDB transaction commits.
   * Concurrent calls share a single in-flight flush.
   */
  async flush(): Promise<void> {
    if (this.#flushTimer !== undefined) {
      clearTimeout(this.#flushTimer);
      this.#flushTimer = undefined;
    }
    if (this.#pendingFlush) {
      return this.#pendingFlush;
    }
    if (this.#queue.length === 0) {
      return;
    }

    const batch = this.#queue;
    this.#queue = [];

    this.#pendingFlush = this.#writeBatch(batch).finally(() => {
      this.#pendingFlush = undefined;
    });
    return this.#pendingFlush;
  }

  /**
   * Read all retained log lines as a JSONL string.
   *
   * If `maxSize` is provided (in bytes), the newest lines are kept and older lines
   * are dropped from the front; lines are never split.
   */
  async export(options: { maxSize?: number } = {}): Promise<string> {
    await this.flush();
    const db = await this.#open();
    const lines = await readAllLines(db, this.#storeName);
    if (options.maxSize !== undefined && options.maxSize >= 0) {
      return trimJsonlToSize(lines, options.maxSize);
    }
    return lines.join('\n');
  }

  /**
   * Discard all stored log records.
   */
  async clear(): Promise<void> {
    this.#queue = [];
    if (this.#flushTimer !== undefined) {
      clearTimeout(this.#flushTimer);
      this.#flushTimer = undefined;
    }
    const db = await this.#open();
    await runTransaction(db, this.#storeName, 'readwrite', (store) => {
      store.clear();
    });
  }

  /**
   * Run an eviction sweep now: trim the store down to `maxRecords` if it has grown past.
   * Eviction runs automatically on a timer; this method is exposed for tests and for
   * callers that want to force a sweep at a particular moment.
   */
  async evictNow(): Promise<void> {
    await this.#maybeEvict();
  }

  /**
   * Stop timers, flush remaining entries, and close the database connection.
   */
  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }
    this.#closed = true;

    if (this.#evictionTimer !== undefined) {
      clearInterval(this.#evictionTimer);
      this.#evictionTimer = undefined;
    }
    this.#removeLifecycleHandlers();

    try {
      await this.flush();
    } catch {
      // Ignore flush errors during shutdown.
    }

    if (this.#db) {
      this.#db.close();
      this.#db = undefined;
      this.#dbPromise = undefined;
    }
  }

  async #writeBatch(batch: string[]): Promise<void> {
    if (batch.length === 0) {
      return;
    }
    let db: IDBDatabase;
    try {
      db = await this.#open();
    } catch {
      // If the database can't be opened, drop the batch silently — logs must never
      // throw out of the processor path.
      return;
    }

    try {
      await runTransaction(db, this.#storeName, 'readwrite', (store) => {
        for (const line of batch) {
          const row: LogRow = { line };
          store.add(row);
        }
      });
    } catch {
      // Ignore write errors.
    }
  }

  async #open(): Promise<IDBDatabase> {
    if (this.#db) {
      return this.#db;
    }
    if (!this.#dbPromise) {
      this.#dbPromise = openDatabase(this.#dbName, this.#storeName).then((db) => {
        this.#db = db;
        db.onclose = () => {
          if (this.#db === db) {
            this.#db = undefined;
            this.#dbPromise = undefined;
          }
        };
        db.onversionchange = () => {
          db.close();
        };
        return db;
      });
    }
    return this.#dbPromise;
  }

  #scheduleEviction(): void {
    if (this.#evictionInterval <= 0) {
      return;
    }
    this.#evictionTimer = setInterval(() => {
      void this.#maybeEvict();
    }, this.#evictionInterval);
  }

  async #maybeEvict(): Promise<void> {
    if (this.#closed) {
      return;
    }
    const locks = (globalThis as any).navigator?.locks as LockManager | undefined;
    if (locks?.request) {
      try {
        await locks.request(EVICTION_LOCK_NAME, { ifAvailable: true }, async (lock) => {
          if (!lock) {
            return;
          }
          await this.#evict();
        });
        return;
      } catch {
        // Fall through to direct eviction if locks fail.
      }
    }
    await this.#evict();
  }

  async #evict(): Promise<void> {
    let db: IDBDatabase;
    try {
      db = await this.#open();
    } catch {
      return;
    }

    const count = await runTransaction(db, this.#storeName, 'readonly', (store) =>
      promisifyRequest(store.count()),
    );
    if (count <= this.#maxRecords) {
      return;
    }

    const toDelete = count - this.#maxRecords;
    await runTransaction(db, this.#storeName, 'readwrite', async (store) => {
      const cutoff = await findCutoffKey(store, toDelete);
      if (cutoff !== undefined) {
        store.delete(IDBKeyRange.upperBound(cutoff));
      }
    });
  }

  #installLifecycleHandlers(): void {
    if (typeof globalThis.addEventListener !== 'function') {
      return;
    }
    this.#pageHideHandler = () => {
      void this.flush();
    };
    this.#visibilityHandler = () => {
      if ((globalThis as any).document?.visibilityState === 'hidden') {
        void this.flush();
      }
    };
    globalThis.addEventListener('pagehide', this.#pageHideHandler);
    globalThis.addEventListener('visibilitychange', this.#visibilityHandler);
  }

  #removeLifecycleHandlers(): void {
    if (typeof globalThis.removeEventListener !== 'function') {
      return;
    }
    if (this.#pageHideHandler) {
      globalThis.removeEventListener('pagehide', this.#pageHideHandler);
      this.#pageHideHandler = undefined;
    }
    if (this.#visibilityHandler) {
      globalThis.removeEventListener('visibilitychange', this.#visibilityHandler);
      this.#visibilityHandler = undefined;
    }
  }
}

const openDatabase = (name: string, storeName: string): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'seq', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
};

const promisifyRequest = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runTransaction = <T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore) => T | Promise<T>,
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(storeName, mode);
    } catch (err) {
      reject(err);
      return;
    }
    let result: T;
    let bodySettled = false;
    let bodyError: unknown;

    tx.oncomplete = () => {
      if (bodyError !== undefined) {
        reject(bodyError);
      } else if (bodySettled) {
        resolve(result);
      } else {
        // Body never settled (shouldn't happen in practice).
        reject(new Error('transaction body did not settle'));
      }
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'));

    try {
      const store = tx.objectStore(storeName);
      const value = body(store);
      Promise.resolve(value)
        .then((resolved) => {
          result = resolved;
          bodySettled = true;
        })
        .catch((err) => {
          bodyError = err;
          try {
            tx.abort();
          } catch {
            // Already settled.
          }
        });
    } catch (err) {
      bodyError = err;
      try {
        tx.abort();
      } catch {
        // Ignore.
      }
    }
  });
};

const readAllLines = async (db: IDBDatabase, storeName: string): Promise<string[]> => {
  return runTransaction(db, storeName, 'readonly', (store) =>
    promisifyRequest(store.getAll()).then((rows) => (rows as LogRow[]).map((row) => row.line)),
  );
};

/**
 * Walk the store in key order and return the key of the `count`-th entry.
 * Returns `undefined` if the store has fewer than `count` entries.
 */
const findCutoffKey = (store: IDBObjectStore, count: number): Promise<IDBValidKey | undefined> => {
  return new Promise((resolve, reject) => {
    if (count <= 0) {
      resolve(undefined);
      return;
    }
    const request = store.openKeyCursor();
    let advanced = false;
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(undefined);
        return;
      }
      if (!advanced && count > 1) {
        advanced = true;
        cursor.advance(count - 1);
        return;
      }
      resolve(cursor.key);
    };
    request.onerror = () => reject(request.error);
  });
};
