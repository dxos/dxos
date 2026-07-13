//
// Copyright 2026 DXOS.org
//

import {
  type LogConfig,
  type LogEntry,
  type LogFilter,
  type LogProcessor,
  inferEnvironmentName,
  parseFilter,
  serializeToJsonl,
  shouldLog,
} from '@dxos/log';

import { byteLengthUtf8, trimJsonlToSize } from './trim';

const DEFAULT_STORE_NAME = 'logs';
const DEFAULT_LOG_FILTER = 'debug';
const DEFAULT_FLUSH_INTERVAL = 250;
const DEFAULT_FLUSH_BATCH_SIZE = 500;
// Sized for ~50 MB on disk at the observed Composer average of ~350 bytes per JSONL line.
const DEFAULT_MAX_RECORDS = 150_000;
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;
/** Max UTF-8 bytes for user-initiated log downloads from app UI (Reset dialog, debug settings, devtools hook). */
export const MANUAL_LOG_EXPORT_MAX_BYTES = 200 * 1024 * 1024;
const DEFAULT_EVICTION_INTERVAL = 30_000;
const EVICTION_LOCK_NAME = '@dxos/log-store-idb:evictor';
// v2 introduced chunked rows with out-of-line array keys (v1 stored one row per line
// under an autoincrement keyPath).
const DB_VERSION = 2;

/**
 * Chunk key: `[epochMs, writerId, writerSeq, lineCount]`.
 *
 * Keys order chunks by flush time; `writerId`/`writerSeq` keep keys from concurrent
 * writers unique. `lineCount` rides in the key so eviction can compute the retention
 * budget from `getAllKeys()` alone, without deserializing chunk values.
 */
type ChunkKey = [epochMs: number, writerId: string, writerSeq: number, lineCount: number];

/**
 * Stored row: one flush batch of pre-encoded JSONL lines joined with `\n` (no trailing
 * newline). Storing the whole batch as a single record keeps the per-flush cost at one
 * structured clone and one backend record regardless of batch size.
 */
type LogChunk = {
  lines: string;
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
   * Soft cap on retained log records (JSONL lines). Eviction drops whole flush chunks,
   * oldest first; the newest chunk is always retained. Default `150_000`.
   */
  maxRecords?: number;
  /**
   * Soft cap on retained log bytes (UTF-8). Eviction drops whole flush chunks, oldest
   * first; the newest chunk is always retained. Default `50 MiB`.
   */
  maxBytes?: number;
  /** Eviction sweep interval in milliseconds. Default `30_000`. */
  evictionInterval?: number;
  /**
   * Identifier embedded in every record's `i` field.
   * Defaults to a scope-aware id of the form `<scope>:<name>:<suffix>` — see {@link inferEnvironmentName}.
   */
  tabId?: string;
  /**
   * Same syntax as `DX_LOG` / {@link parseFilter} (e.g. `debug`, `info`, `pattern:warn`).
   * Entries below the minimum level are not stored. Default `debug` (TRACE is excluded).
   */
  logFilter?: string;
};

/**
 * IndexedDB-backed log store.
 *
 * Logs are batched in memory and each flush is written as a single chunk record of
 * pre-encoded JSONL. Multiple browsing contexts can write to the same database
 * concurrently — IDB serializes transactions, so no extra coordination is needed for
 * writes. Eviction is deduplicated across tabs via the Web Locks API (`ifAvailable`).
 *
 * Flushes are triggered by:
 * - a deferred task after `flushInterval` (background priority where the Scheduler API
 *   is available, so flushes don't compete with input handling and rendering),
 * - the queue exceeding `flushBatchSize`,
 * - `visibilitychange` to `hidden` and `pagehide` events.
 */
export class IdbLogStore {
  readonly #dbName: string;
  readonly #storeName: string;
  readonly #flushInterval: number;
  readonly #flushBatchSize: number;
  readonly #maxRecords: number;
  readonly #maxBytes: number;
  readonly #evictionInterval: number;
  readonly #tabId: string;
  readonly #filters: LogFilter[];
  /** Distinguishes chunk keys written by concurrent contexts against the same database. */
  readonly #writerId = Math.random().toString(36).slice(2);

  #queue: string[] = [];
  #writerSeq = 0;
  #flushTask: ScheduledTask | undefined;
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
    this.#maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.#evictionInterval = options.evictionInterval ?? DEFAULT_EVICTION_INTERVAL;
    this.#tabId = options.tabId ?? inferEnvironmentName();
    this.#filters = parseFilter(options.logFilter ?? DEFAULT_LOG_FILTER);

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
    if (!shouldLog(entry, this.#filters)) {
      return;
    }
    const line = serializeToJsonl(entry, { env: this.#tabId });
    if (line === undefined) {
      return;
    }
    this.#queue.push(line);

    if (this.#queue.length >= this.#flushBatchSize) {
      void this.flush();
    } else if (this.#flushTask === undefined) {
      this.#flushTask = scheduleBackgroundTask(() => {
        this.#flushTask = undefined;
        void this.flush();
      }, this.#flushInterval);
    }
  };

  /**
   * Force a flush now and resolve once the IDB transaction commits.
   * Concurrent calls share a single in-flight flush.
   */
  async flush(): Promise<void> {
    if (this.#flushTask !== undefined) {
      this.#flushTask.cancel();
      this.#flushTask = undefined;
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
   *
   * For full exports of very large stores, prefer {@link exportBlob} — building one
   * giant string can exceed the engine's maximum string length.
   */
  async export(options: { maxSize?: number } = {}): Promise<string> {
    const blob = await this.exportBlob(options);
    return blob.text();
  }

  /**
   * Read all retained log lines as an NDJSON blob without materializing one giant string.
   * Prefer this for browser downloads of large log stores.
   */
  async exportBlob(options: { maxSize?: number } = {}): Promise<Blob> {
    await this.flush();
    await this.#maybeEvict();
    const db = await this.#open();
    const chunks = await readAllChunks(db, this.#storeName);
    const maxSize = options.maxSize ?? this.#maxBytes;
    if (maxSize >= 0) {
      // Trim on individual lines so the size cap never under-fills by a whole chunk.
      const lines = chunks.flatMap((chunk) => chunk.split('\n'));
      const trimmed = trimJsonlToSize(lines, maxSize);
      return new Blob([trimmed], { type: 'application/x-ndjson' });
    }
    return buildNdjsonBlob(chunks);
  }

  /**
   * Discard all stored log records.
   */
  async clear(): Promise<void> {
    this.#queue = [];
    if (this.#flushTask !== undefined) {
      this.#flushTask.cancel();
      this.#flushTask = undefined;
    }
    const db = await this.#open();
    await runTransaction(db, this.#storeName, 'readwrite', (store) => {
      store.clear();
    });
  }

  /**
   * Run an eviction sweep now: trim the store down to `maxRecords` / `maxBytes` if it
   * has grown past. Eviction runs automatically on a timer; this method is exposed for
   * tests and for callers that want to force a sweep at a particular moment.
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
      const chunk: LogChunk = { lines: batch.join('\n') };
      const key: ChunkKey = [Date.now(), this.#writerId, this.#writerSeq++, batch.length];
      await runTransaction(db, this.#storeName, 'readwrite', (store) => {
        store.add(chunk, key);
      });
      void this.#maybeEvict();
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

    await runTransaction(db, this.#storeName, 'readwrite', async (store) => {
      const keys = (await promisifyRequest(store.getAllKeys())) as ChunkKey[];
      if (keys.length === 0) {
        return;
      }
      const rows = (await promisifyRequest(store.getAll())) as LogChunk[];
      const chunks = keys.map((key, index) => ({
        key,
        lineCount: key[3],
        byteLength: byteLengthUtf8(rows[index]!.lines),
      }));
      const cutoff = findEvictionCutoff(chunks, this.#maxRecords, this.#maxBytes);
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
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // The v1 schema stored one row per line under an autoincrement keyPath; chunked
      // storage requires out-of-line keys, so the store is recreated and v1 data is
      // discarded (logs are expendable diagnostics).
      if (db.objectStoreNames.contains(storeName)) {
        db.deleteObjectStore(storeName);
      }
      db.createObjectStore(storeName);
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

const readAllChunks = async (db: IDBDatabase, storeName: string): Promise<string[]> => {
  return runTransaction(db, storeName, 'readonly', (store) =>
    promisifyRequest(store.getAll()).then((rows) => (rows as LogChunk[]).map((row) => row.lines)),
  );
};

/** Assemble chunk payloads into one NDJSON blob without `Array.join` (avoids max-string-length errors). */
const buildNdjsonBlob = (chunks: readonly string[]): Blob => {
  if (chunks.length === 0) {
    return new Blob([], { type: 'application/x-ndjson' });
  }
  const parts: BlobPart[] = [chunks[0]!];
  for (let index = 1; index < chunks.length; index++) {
    parts.push('\n', chunks[index]!);
  }
  return new Blob(parts, { type: 'application/x-ndjson' });
};

type ChunkRetentionStats = {
  key: ChunkKey;
  lineCount: number;
  byteLength: number;
};

/**
 * Given all chunks in ascending (key) order, return the key of the newest chunk that
 * must be evicted — delete it and everything older — so retained totals stay within
 * `maxRecords` and `maxBytes`. The newest chunk is always retained, even if it alone
 * exceeds the budget. Returns `undefined` when everything fits.
 */
const findEvictionCutoff = (
  chunks: readonly ChunkRetentionStats[],
  maxRecords: number,
  maxBytes: number,
): ChunkKey | undefined => {
  let retainedLines = 0;
  let retainedBytes = 0;
  for (let index = chunks.length - 1; index >= 0; index--) {
    const chunk = chunks[index]!;
    retainedLines += chunk.lineCount;
    retainedBytes += chunk.byteLength;
    if ((retainedLines > maxRecords || retainedBytes > maxBytes) && index < chunks.length - 1) {
      return chunk.key;
    }
  }
  return undefined;
};

type ScheduledTask = { cancel: () => void };

type SchedulerLike = {
  postTask: (
    callback: () => void,
    options?: { priority?: 'background' | 'user-visible' | 'user-blocking'; delay?: number; signal?: AbortSignal },
  ) => Promise<unknown>;
};

/**
 * Run `callback` after `delay` ms at background priority where the Scheduler API is
 * available, so deferred work yields to input handling and rendering; falls back to a
 * plain timeout elsewhere.
 */
const scheduleBackgroundTask = (callback: () => void, delay: number): ScheduledTask => {
  // The Scheduler API is not in the TS DOM lib yet.
  const scheduler = (globalThis as { scheduler?: SchedulerLike }).scheduler;
  if (typeof scheduler?.postTask === 'function') {
    const controller = new AbortController();
    scheduler.postTask(callback, { priority: 'background', delay, signal: controller.signal }).catch(() => {
      // Rejects on abort; the callback never ran.
    });
    return { cancel: () => controller.abort() };
  }
  const timer = setTimeout(callback, delay);
  return { cancel: () => clearTimeout(timer) };
};
