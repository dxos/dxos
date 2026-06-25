//
// Copyright 2025 DXOS.org
//

import { type Chunk, type StorageAdapterInterface, type StorageKey } from '@automerge/automerge-repo';
import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import { Resource } from '@dxos/context';
import { RuntimeProvider } from '@dxos/effect';
import { log } from '@dxos/log';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { type MaybePromise } from '@dxos/util';

import { type StorageAdapterDataMonitor } from './leveldb-storage-adapter';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

export type SqliteStorageAdapterProps = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
  callbacks?: SqliteStorageCallbacks;
  monitor?: StorageAdapterDataMonitor;
};

export type SqliteStorageCallbacks = {
  afterSave?(path: StorageKey): MaybePromise<void>;
};

/**
 * SQLite-backed automerge StorageAdapterInterface.
 * Stores automerge document chunks in the `automerge_chunks` table.
 * Replaces LevelDBStorageAdapter.
 */
export class SqliteStorageAdapter extends Resource implements StorageAdapterInterface {
  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
  readonly #callbacks?: SqliteStorageCallbacks;
  readonly #monitor?: StorageAdapterDataMonitor;

  constructor({ runtime, callbacks, monitor }: SqliteStorageAdapterProps) {
    super();
    this.#runtime = runtime;
    this.#callbacks = callbacks;
    this.#monitor = monitor;
  }

  /**
   * Creates the automerge_chunks table if it does not exist.
   */
  readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag> = Effect.fn(
    'SqliteStorageAdapter.migrate',
  )(() =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`CREATE TABLE IF NOT EXISTS automerge_chunks (
          key TEXT PRIMARY KEY,
          data BLOB NOT NULL
        )`;
      log('automerge_chunks table ready');
    }).pipe(Effect.withSpan('SqliteStorageAdapter.migrate')),
  )();

  async load(keyArray: StorageKey): Promise<Uint8Array | undefined> {
    if (!this.isOpen) {
      return undefined;
    }
    const startMs = Date.now();
    const encoded = encodeKey(keyArray);
    const rows = await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ data: Uint8Array }>`SELECT data FROM automerge_chunks WHERE key = ${encoded}`;
      }),
    );
    if (rows.length === 0) {
      return undefined;
    }
    // SQLite returns BLOB columns as Buffer in Node.js; coerce to plain Uint8Array.
    const chunk = toUint8Array(rows[0].data);
    this.#monitor?.recordBytesLoaded(chunk.byteLength);
    this.#monitor?.recordLoadDuration(Date.now() - startMs);
    return chunk;
  }

  async save(keyArray: StorageKey, binary: Uint8Array): Promise<void> {
    if (!this.isOpen) {
      return;
    }
    const startMs = Date.now();
    const encoded = encodeKey(keyArray);
    // TODO(dmaretskyi): If another transaction is running concurently, this write will be associated with the wrong transaction.
    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`INSERT OR REPLACE INTO automerge_chunks (key, data) VALUES (${encoded}, ${binary})`;
      }),
    );
    this.#monitor?.recordBytesStored(binary.byteLength);
    this.#monitor?.recordStoreDuration(Date.now() - startMs);
    await this.#callbacks?.afterSave?.(keyArray);
  }

  async saveBatch(entries: Array<[StorageKey, Uint8Array]>): Promise<void> {
    if (!this.isOpen || entries.length === 0) {
      return;
    }
    const startMs = Date.now();
    const encoded = entries.map(([key, data]) => [encodeKey(key), data] as const);
    // TODO(dmaretskyi): replace with one batched write.
    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const tx = yield* SqlTransaction.SqlTransaction;
        yield* tx.withTransaction(
          Effect.gen(function* () {
            for (const [key, data] of encoded) {
              yield* sql`INSERT OR REPLACE INTO automerge_chunks (key, data) VALUES (${key}, ${data})`;
            }
          }),
        );
      }),
    );
    let bytesStored = 0;
    for (const [keyArray, binary] of entries) {
      bytesStored += binary.byteLength;
      await this.#callbacks?.afterSave?.(keyArray);
    }
    this.#monitor?.recordBytesStored(bytesStored);
    this.#monitor?.recordStoreDuration(Date.now() - startMs);
  }

  async remove(keyArray: StorageKey): Promise<void> {
    if (!this.isOpen) {
      return;
    }
    const encoded = encodeKey(keyArray);
    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM automerge_chunks WHERE key = ${encoded}`;
      }),
    );
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    if (!this.isOpen) {
      return [];
    }
    const startMs = Date.now();
    const prefix = encodeKey(keyPrefix);
    const glob = prefix + '-*';
    const rows = await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ key: string; data: Uint8Array }>`
          SELECT key, data FROM automerge_chunks
          WHERE key = ${prefix} OR key GLOB ${glob}
          ORDER BY key ASC
        `;
      }),
    );
    let bytesLoaded = 0;
    const chunks: Chunk[] = rows.map((row) => {
      // SQLite returns BLOB columns as Buffer in Node.js; coerce to plain Uint8Array.
      const data = toUint8Array(row.data);
      bytesLoaded += data.byteLength;
      return { key: decodeKey(row.key), data };
    });
    this.#monitor?.recordBytesLoaded(bytesLoaded);
    this.#monitor?.recordLoadDuration(Date.now() - startMs);
    return chunks;
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    if (!this.isOpen) {
      return;
    }
    const prefix = encodeKey(keyPrefix);
    const glob = prefix + '-*';
    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM automerge_chunks WHERE key = ${prefix} OR key GLOB ${glob}`;
      }),
    );
  }
}

/** Coerces a value to a plain Uint8Array (Buffer is a subclass in Node.js but not identical). */
const toUint8Array = (value: Uint8Array): Uint8Array =>
  value instanceof Uint8Array && value.constructor === Uint8Array
    ? value
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

/**
 * Encodes a StorageKey array to a single TEXT key for SQLite storage.
 * Uses '-' as separator; '%' and '-' in values are percent-encoded for safe round-tripping.
 */
export const encodeKey = (key: StorageKey): string =>
  key.map((k) => k.replaceAll('%', '%25').replaceAll('-', '%2D')).join('-');

/**
 * Decodes a TEXT key back to a StorageKey array.
 */
export const decodeKey = (encoded: string): StorageKey =>
  encoded.split('-').map((k) => k.replaceAll('%2D', '-').replaceAll('%25', '%'));
