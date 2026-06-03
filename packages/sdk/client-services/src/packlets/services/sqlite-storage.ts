//
// Copyright 2025 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import type { Callback, FileStat, RandomAccessStorage } from 'random-access-storage';

import { RuntimeProvider } from '@dxos/effect';
import { log } from '@dxos/log';
import { Directory, type File, StorageType, type Storage, wrapFile } from '@dxos/random-access-storage';
import { SqlTransaction } from '@dxos/sql-sqlite';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

export type SqliteStorageOptions = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
};

/**
 * SQLite-backed random-access file for hypercore storage.
 * Stores each file as a blob in `hypercore_files`. Read-modify-write for writes.
 */
class SqliteRandomAccessFile extends EventEmitter implements RandomAccessStorage {
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
    if (!this.#loading) {
      this.#loading = this._loadFromDb();
    }
    return this.#loading;
  }

  private async _loadFromDb(): Promise<void> {
    const filePath = this.filePath;
    const rows = await RuntimeProvider.runPromise(this.runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ data: Uint8Array }>`SELECT data FROM hypercore_files WHERE path = ${filePath}`;
      }),
    );
    this.#buffer = rows.length > 0 ? Buffer.from(rows[0].data) : Buffer.alloc(0);
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
    cb(null);
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
    const dirPath = sub ? join(this.path, sub) : this.path;
    const runtime = this.#runtime;
    const files = this.#files;
    const nativeFiles = this.#nativeFiles;

    const getOrCreateFile = (path: string, filename: string): File => {
      const fullPath = join(path, filename);
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
    this.#files.clear();
  }
}
