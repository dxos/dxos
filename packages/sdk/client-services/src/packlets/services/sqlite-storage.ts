//
// Copyright 2025 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type { Callback, FileStat, RandomAccessStorage } from 'random-access-storage';

import { RuntimeProvider } from '@dxos/effect';
import { FeedStorageDirectoryService } from '@dxos/feed-store';
import { log } from '@dxos/log';
import { Directory, type File, type Storage, StorageType, wrapFile } from '@dxos/random-access-storage';
import { SqlTransaction } from '@dxos/sql-sqlite';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

/**
 * True when a rejected SQL op failed because its connection was already closed — the message
 * `The database connection is not open` (raised by `@effect/sql-sqlite-node`), which arrives
 * wrapped as an effect `SqlError`, so walk the `cause` chain. Signals teardown, not a real fault.
 */
export const isClosedConnectionError = (err: unknown): boolean => {
  for (let cur: any = err, depth = 0; cur != null && depth < 5; cur = cur.cause, depth++) {
    const message = typeof cur === 'string' ? cur : cur.message;
    if (typeof message === 'string' && /connection is not open/i.test(message)) {
      return true;
    }
  }
  return false;
};

export type SqliteStorageOptions = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
};

/**
 * Effect service tag for {@link SqliteStorage}.
 */
export class SqliteStorageService extends EffectContext.Tag('@dxos/client-services/SqliteStorage')<
  SqliteStorageService,
  SqliteStorage
>() {}

/** Minimal cross-platform EventEmitter needed by the RandomAccessStorage contract. */
class BaseEventEmitter {
  readonly #events: Record<string, ((...args: unknown[]) => void)[]> = Object.create(null);

  on(event: string, listener: (...args: unknown[]) => void): this {
    (this.#events[event] ??= []).push(listener);
    return this;
  }
  off(event: string, listener: (...args: unknown[]) => void): this {
    const list = this.#events[event];
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) {
        list.splice(idx, 1);
      }
    }
    return this;
  }
  emit(event: string, ...args: unknown[]): boolean {
    const list = this.#events[event];
    if (!list?.length) {
      return false;
    }
    for (const fn of [...list]) {
      fn(...args);
    }
    return true;
  }
  addListener = this.on;
  removeListener = this.off;
  once(event: string, listener: (...args: unknown[]) => void): this {
    const wrapper = (...args: unknown[]) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }
  removeAllListeners(event?: string): this {
    if (event) {
      delete this.#events[event];
    } else {
      for (const key of Object.keys(this.#events)) {
        delete this.#events[key];
      }
    }
    return this;
  }
  listeners(event: string): ((...args: unknown[]) => void)[] {
    return this.#events[event] ?? [];
  }
  rawListeners(event: string): ((...args: unknown[]) => void)[] {
    return this.#events[event] ?? [];
  }
  listenerCount(event: string): number {
    return this.#events[event]?.length ?? 0;
  }
  prependListener(event: string, listener: (...args: unknown[]) => void): this {
    (this.#events[event] ??= []).unshift(listener);
    return this;
  }
  prependOnceListener(event: string, listener: (...args: unknown[]) => void): this {
    const wrapper = (...args: unknown[]) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.prependListener(event, wrapper);
  }
  eventNames(): string[] {
    return Object.keys(this.#events);
  }
  getMaxListeners(): number {
    return 0;
  }
  setMaxListeners(): this {
    return this;
  }
}

/**
 * SQLite-backed random-access file for hypercore storage.
 * Stores each file as a blob in `hypercore_files`. Read-modify-write for writes.
 */
class SqliteRandomAccessFile extends BaseEventEmitter implements RandomAccessStorage {
  readonly opened: boolean = false;
  readonly suspended: boolean = false;
  readonly writing: boolean = false;
  readonly readable: boolean = true;
  readonly writable: boolean = true;
  readonly deletable: boolean = true;
  readonly truncatable: boolean = false;
  // Setting statable=false prevents hypercore's statAndReadAll() from computing a negative
  // read-size (stat.size - offset) for new empty files, which causes an infinite async loop.
  readonly statable: boolean = false;

  #closed = false;
  #unlinked = false;
  #destroyed = false;

  get closed(): boolean {
    return this.#closed;
  }

  get unlinked(): boolean {
    return this.#unlinked;
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  // Filesystem-like metadata for compatibility with wrapFile.
  readonly directory: string;
  readonly filename: string;

  #buffer: Buffer = Buffer.alloc(0);
  #loaded = false;
  #loading: Promise<void> | null = null;

  constructor(
    private readonly filePath: string,
    private readonly runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>,
  ) {
    super();
    const parts = filePath.split('/');
    this.filename = parts.pop() ?? '';
    this.directory = parts.join('/');
  }

  private _ensureLoaded(): Promise<void> {
    if (this.#loaded) {
      return Promise.resolve();
    }
    // If the file was closed (e.g. the storage was torn down during shutdown) before its initial
    // load completed, don't start the DB read. The underlying SQL connection may already be
    // closing, and the read would reject with "database connection is not open" as an unhandled
    // rejection — a background read racing teardown. #buffer already defaults to empty, so reads
    // resolve against an empty file.
    if (this.#closed) {
      return Promise.resolve();
    }
    if (!this.#loading) {
      this.#loading = this._loadFromDb();
      // Mark the cached load promise as handled so that if it rejects after every awaiter is gone
      // (e.g. the SQL runtime is disposed at teardown without close() being called on this file),
      // the rejection is never surfaced as an unhandled rejection. Legitimate awaiters still observe
      // the error through their own `.then`/`.catch` on the same promise returned below.
      this.#loading.catch(() => {});
    }
    return this.#loading;
  }

  private async _loadFromDb(): Promise<void> {
    const filePath = this.filePath;
    try {
      const rows = await RuntimeProvider.runPromise(this.runtime)(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          return yield* sql<{ data: Uint8Array }>`SELECT data FROM hypercore_files WHERE path = ${filePath}`;
        }),
      );
      this.#buffer = rows.length > 0 ? Buffer.from(rows[0].data) : Buffer.alloc(0);
    } catch (err) {
      // A read racing teardown rejects with "database connection is not open". The `#closed` guard
      // in `_ensureLoaded` only catches reads not yet started, and `#closed` covers only this file
      // being closed — during client disposal the shared SQL connection can be torn down while this
      // file's `#closed` is still false (the container closed the connection without closing every
      // file first). In either case a closed connection means there is nothing to load, so fall back
      // to the empty `#buffer`; rethrow only a genuine error against a live connection. Swallowing an
      // unhandled rejection here otherwise crashes the whole test worker (exit 1, no test failure).
      if (!this.#closed && !isClosedConnectionError(err)) {
        throw err;
      }
    }
    this.#loaded = true;
  }

  private async _saveToDb(): Promise<void> {
    const filePath = this.filePath;
    const data = this.#buffer;
    await RuntimeProvider.runPromise(this.runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`INSERT OR REPLACE INTO hypercore_files (path, data) VALUES (${filePath}, ${data})`;
      }),
    );
  }

  write(offset: number, data: Buffer, cb: Callback<any>): void {
    this._ensureLoaded()
      .then(() => {
        const end = offset + data.length;
        if (end > this.#buffer.length) {
          const enlarged = Buffer.alloc(end);
          this.#buffer.copy(enlarged);
          this.#buffer = enlarged;
        }
        data.copy(this.#buffer, offset);
        return this._saveToDb();
      })
      .then(() => cb(null))
      .catch((err) => cb(err));
  }

  read(offset: number, size: number, cb: Callback<Buffer>): void {
    this._ensureLoaded()
      .then(() => {
        if (size === 0) {
          cb(null, Buffer.alloc(0));
          return;
        }
        if (offset + size > this.#buffer.length) {
          cb(new Error(`Could not satisfy length ${size} at offset ${offset} (file size: ${this.#buffer.length})`));
          return;
        }
        cb(null, Buffer.from(this.#buffer.subarray(offset, offset + size)));
      })
      .catch((err) => cb(err));
  }

  del(offset: number, size: number, cb: Callback<any>): void {
    this._ensureLoaded()
      .then(() => {
        const end = Math.min(offset + size, this.#buffer.length);
        if (offset < end) {
          this.#buffer.fill(0, offset, end);
        }
        return this._saveToDb();
      })
      .then(() => cb(null))
      .catch((err) => cb(err));
  }

  stat(cb: Callback<FileStat>): void {
    this._ensureLoaded()
      .then(() => {
        cb(null, { size: this.#buffer.length });
      })
      .catch((err) => cb(err));
  }

  close(cb: Callback<Error>): void {
    this.#closed = true;
    // Drain any in-flight initial load before reporting closed, so a read never races a
    // torn-down SQL connection (avoids "database connection is not open" unhandled rejections).
    (this.#loading ?? Promise.resolve()).then(
      () => cb(null),
      () => cb(null),
    );
  }

  destroy(cb: Callback<Error>): void {
    const filePath = this.filePath;
    RuntimeProvider.runPromise(this.runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM hypercore_files WHERE path = ${filePath}`;
      }),
    )
      .then(() => {
        this.#buffer = Buffer.alloc(0);
        this.#destroyed = true;
        this.#unlinked = true;
        this.#closed = true;
        cb(null);
      })
      .catch((err) => cb(err));
  }
}

/**
 * SQLite-backed Storage implementation for hypercore feeds.
 * Table: hypercore_files(path TEXT PRIMARY KEY, data BLOB NOT NULL DEFAULT x'').
 */
export class SqliteStorage implements Storage {
  readonly path: string;
  readonly type = StorageType.NODE;

  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
  readonly #files = new Map<string, File>();
  readonly #nativeFiles = new Map<string, SqliteRandomAccessFile>();
  #closed = false;

  constructor({ runtime }: SqliteStorageOptions, path = '/sqlite-feeds') {
    this.#runtime = runtime;
    this.path = path;
  }

  readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag> = Effect.fn(
    'SqliteStorage.migrate',
  )(() =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`CREATE TABLE IF NOT EXISTS hypercore_files (
          path TEXT PRIMARY KEY,
          data BLOB NOT NULL DEFAULT x''
        )`;
      log('hypercore_files table ready');
    }).pipe(Effect.withSpan('SqliteStorage.migrate')),
  )();

  get size(): number {
    return this.#files.size;
  }

  createDirectory(sub = ''): Directory {
    const dirPath = sub ? `${this.path}/${sub}` : this.path;
    const runtime = this.#runtime;
    const files = this.#files;
    const nativeFiles = this.#nativeFiles;

    const getOrCreateFile = (path: string, filename: string): File => {
      const fullPath = `${path}/${filename}`;
      const existingNative = nativeFiles.get(fullPath);
      if (existingNative && !existingNative.destroyed) {
        return files.get(fullPath)!;
      }
      const native = new SqliteRandomAccessFile(fullPath, runtime);
      const file = wrapFile(native, StorageType.NODE);
      files.set(fullPath, file);
      nativeFiles.set(fullPath, native);
      return file;
    };

    const list = async (path: string): Promise<string[]> => {
      const prefix = path.endsWith('/') ? path : path + '/';
      const rows = await RuntimeProvider.runPromise(runtime)(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          return yield* sql<{
            path: string;
          }>`SELECT path FROM hypercore_files WHERE path = ${path} OR path LIKE ${prefix + '%'}`;
        }),
      );
      return rows.map((row) => row.path.replace(path + '/', '').replace(path, ''));
    };

    const remove = async (): Promise<void> => {
      const prefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';
      await RuntimeProvider.runPromise(runtime)(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* sql`DELETE FROM hypercore_files WHERE path = ${dirPath} OR path LIKE ${prefix + '%'}`;
        }),
      );
      // Clean up in-memory file cache.
      for (const [filePath] of files) {
        if (filePath === dirPath || filePath.startsWith(prefix)) {
          files.delete(filePath);
        }
      }
    };

    return new Directory({
      type: StorageType.NODE,
      path: dirPath,
      list,
      getOrCreateFile,
      remove,
    });
  }

  async reset(): Promise<void> {
    log('SqliteStorage: clearing all hypercore files');
    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM hypercore_files`;
      }),
    );
    this.#files.clear();
  }

  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    // Close each native file before the SQL connection is torn down. `close()` marks the file
    // closed (so any subsequent read skips the DB) and drains its in-flight initial load —
    // preventing "database connection is not open" unhandled rejections from background reads
    // that race shutdown (e.g. a test client closing while a background sync read is in flight).
    const natives = [...this.#nativeFiles.values()];
    await Promise.all(natives.map((native) => new Promise<void>((resolve) => native.close(() => resolve()))));
    this.#files.clear();
    this.#nativeFiles.clear();
  }
}

export type SqliteStorageLayerOptions = {
  path?: string;
};

/**
 * Effect Layer constructing a {@link SqliteStorage} from the ambient SQL runtime.
 */
export const SqliteStorageLayer = (
  options: SqliteStorageLayerOptions = {},
): Layer.Layer<SqliteStorageService, never, SqlClient.SqlClient | SqlTransactionTag> =>
  Layer.effect(
    SqliteStorageService,
    Effect.gen(function* () {
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransactionTag>();
      return new SqliteStorage({ runtime }, options.path);
    }),
  );

export type FeedStorageDirectoryLayerOptions = {
  sub?: string;
};

/**
 * Effect Layer providing the hypercore feeds root directory from {@link SqliteStorage}.
 */
export const FeedStorageDirectoryLayer = (
  options: FeedStorageDirectoryLayerOptions = {},
): Layer.Layer<FeedStorageDirectoryService, never, SqliteStorageService> =>
  Layer.effect(
    FeedStorageDirectoryService,
    Effect.gen(function* () {
      const storage = yield* SqliteStorageService;
      return storage.createDirectory(options.sub ?? 'feeds');
    }),
  );
