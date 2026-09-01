//
// Copyright 2025 DXOS.org
//

import { type Chunk, type StorageAdapterInterface, type StorageKey } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { RuntimeProvider } from '@dxos/effect';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { type MaybePromise } from '@dxos/util';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/chunks/index.ts';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

export interface StorageAdapterDataMonitor {
  recordBytesStored(count: number): void;
  recordBytesLoaded(count: number): void;
  recordLoadDuration(durationMs: number): void;
  recordStoreDuration(durationMs: number): void;
}

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
 */
export class SqliteStorageAdapter implements StorageAdapterInterface {
  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
  readonly #callbacks?: SqliteStorageCallbacks;
  readonly #monitor?: StorageAdapterDataMonitor;

  #open = false;

  constructor({ runtime, callbacks, monitor }: SqliteStorageAdapterProps) {
    this.#runtime = runtime;
    this.#callbacks = callbacks;
    this.#monitor = monitor;
  }

  get isOpen(): boolean {
    return this.#open;
  }

  async open(): Promise<void> {
    this.#open = true;
  }

  async close(): Promise<void> {
    this.#open = false;
  }

  /**
   * Applies any migrations this database has not recorded yet. `SqlTransaction.clientLayer` is
   * provided because the migrator wraps its work in the client's `withTransaction`, which emits
   * `BEGIN` / `COMMIT` — rejected in workerd.
   */
  readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag> = Migrator.make({})(
    { loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE },
  ).pipe(
    Effect.provide(SqlTransaction.clientLayer),
    // A malformed bundled manifest is a defect, not something a caller can recover from.
    Effect.catchTag('MigrationError', (error) => Effect.die(error)),
    Effect.asVoid,
    Effect.withSpan('SqliteStorageAdapter.migrate'),
  );

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
    const { lower, upper } = descendantRange(prefix);
    // Two index seeks unioned, rather than `key = ? OR key GLOB ?`: the OR plans as MULTI-INDEX OR
    // and discards index ordering, so an SQL `ORDER BY` there materializes a temp B-tree. Sorting in
    // JS instead is free at the sizes this returns (usually one or two rows) and keeps both branches
    // plain range seeks. Equivalence with the previous predicate is covered by tests.
    const rows = await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ key: string; data: Uint8Array }>`
          SELECT key, data FROM automerge_chunks WHERE key = ${prefix}
          UNION ALL
          SELECT key, data FROM automerge_chunks WHERE key >= ${lower} AND key < ${upper}
        `;
      }),
    );
    // SQLite compares TEXT with BINARY collation (byte order). Encoded keys are ASCII for every
    // segment shape in use, where JS string order agrees with it.
    const sorted = [...rows].sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
    let bytesLoaded = 0;
    const chunks: Chunk[] = sorted.map((row) => {
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
    await RuntimeProvider.runPromise(this.#runtime)(this.removeRangeEffect(keyPrefix));
  }

  /**
   * {@link removeRange} as an effect, so a caller deleting the several ranges a document spans can
   * commit them as one transaction.
   */
  removeRangeEffect(keyPrefix: StorageKey): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> {
    const prefix = encodeKey(keyPrefix);
    const { lower, upper } = descendantRange(prefix);
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`DELETE FROM automerge_chunks WHERE key = ${prefix} OR (key >= ${lower} AND key < ${upper})`;
    }).pipe(Effect.withSpan('SqliteStorageAdapter.removeRange'));
  }
}

/**
 * Key space `SubductionStorageBridge` writes into this same table, as
 * `[SUBDUCTION_PREFIX, <family>, <sedimentreeId>, ...]`. Disjoint from a document's classical
 * `<documentId>-*` keys, so collection has to sweep it explicitly — on the subduction transport it
 * holds most of the document's bytes.
 */
export const SUBDUCTION_PREFIX = 'subduction';

export const SUBDUCTION_KEY_FAMILIES = [
  'ids',
  'commits',
  'blobs',
  'fragments',
  'fragment-blobs',
  'remote-heads',
] as const;

/** Coerces a value to a plain Uint8Array (Buffer is a subclass in Node.js but not identical). */
const toUint8Array = (value: Uint8Array): Uint8Array =>
  value instanceof Uint8Array && value.constructor === Uint8Array
    ? value
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

/** Segment separator. Occurrences inside a segment are escaped to `%2D` (its percent-encoding). */
const SEPARATOR = '-';

/**
 * Encodes a StorageKey array to a single TEXT key for SQLite storage.
 * Uses '-' as separator; '%' and '-' in values are percent-encoded for safe round-tripping.
 */
export const encodeKey = (key: StorageKey): string =>
  key.map((k) => k.replaceAll('%', '%25').replaceAll(SEPARATOR, '%2D')).join(SEPARATOR);

/**
 * Decodes a TEXT key back to a StorageKey array.
 */
export const decodeKey = (encoded: string): StorageKey =>
  encoded.split(SEPARATOR).map((k) => k.replaceAll('%2D', SEPARATOR).replaceAll('%25', '%'));

/** One past `SEPARATOR` in byte order, so `[prefix + SEPARATOR, prefix + SEPARATOR_UPPER_BOUND)` is a half-open range. */
const SEPARATOR_UPPER_BOUND = String.fromCharCode(SEPARATOR.charCodeAt(0) + 1);

/**
 * Half-open bounds selecting exactly the descendants of `prefix` — keys continuing with the
 * separator, not merely with the same text. Anchoring on `prefix + SEPARATOR` rather than on
 * `prefix` is what makes this a segment-boundary match: the bounds then differ at the character
 * immediately after the prefix, so only the separator falls between them. A range anchored on
 * `prefix` itself would compare nothing past the prefix and so would also return a sibling whose
 * segment merely starts with the same text (prefix `…-doc1` matching key `…-doc1X-…`) — a different
 * document's chunks. Since the key layout is protocol, that must not depend on segment charset.
 *
 * Exact regardless of what segments contain: a key is in range iff the byte after `prefix` is `>=`
 * separator and `<` its successor, i.e. is the separator. UTF-8 cannot smuggle those bytes into a
 * multi-byte sequence (continuation and lead bytes are all `>= 0x80`).
 *
 * Excludes `prefix` itself, which callers select separately — {@link loadRange} must still return a
 * key stored at exactly the queried prefix (the `subduction-ids-<sid>` shape does this).
 */
const descendantRange = (prefix: string): { lower: string; upper: string } => ({
  lower: prefix + SEPARATOR,
  upper: prefix + SEPARATOR_UPPER_BOUND,
});
