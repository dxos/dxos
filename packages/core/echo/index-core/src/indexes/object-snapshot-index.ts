//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';
import type * as Statement from 'effect/sql/Statement';

import type { Obj } from '@dxos/echo';
import { ATTR_TYPE } from '@dxos/echo/internal';
import { failedInvariant } from '@dxos/invariant';
import * as Jsonb from '@dxos/util/Jsonb';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/object-snapshot/index.ts';
import { chunkArray, chunkRows } from '../utils.ts';
import { type EntityMeta } from './entity-meta-index.ts';
import type { Index, IndexerObject } from './interface.ts';

/**
 * The JSON of every indexed object, keyed by its `objectMeta` record id.
 *
 * This is the row store: every query that reads object data reads it here, so it is written on the
 * indexing pass itself and is never behind the data source. The full-text index is a second step
 * over it (see {@link FtsIndex}), which is what lets that expensive rebuild lag without a reader
 * observing a stale row.
 */
export class ObjectSnapshotIndex implements Index {
  readonly #sql: SqlClient.SqlClient;

  constructor(sql: SqlClient.SqlClient) {
    this.#sql = sql;
  }

  /**
   * Applies any migrations this database has not recorded yet.
   */
  migrate = Effect.fn('ObjectSnapshotIndex.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
      Effect.provideService(SqlClient.SqlClient, this.#sql),
    ),
  );

  /**
   * Query snapshots by recordIds.
   * Returns the parsed JSON snapshots for queue objects.
   * RecordIds not present in the store are silently omitted from the result.
   */
  querySnapshotsJSON(
    recordIds: number[],
  ): Effect.Effect<readonly { recordId: number; snapshot: Obj.JSON }[], SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      if (recordIds.length === 0) {
        return [];
      }
      const sql = this.#sql;

      const results: { recordId: number; snapshot: Obj.JSON }[] = [];
      for (const chunk of chunkArray(recordIds)) {
        const rows = yield* sql<{
          recordId: number;
          snapshot: StoredBlob;
        }>`SELECT recordId, snapshot FROM objectSnapshot WHERE recordId IN ${sql.in(chunk)}`;
        for (const row of rows) {
          results.push({ recordId: row.recordId, snapshot: decodeSnapshot(row.snapshot) });
        }
      }

      return results;
    });
  }

  /**
   * Query snapshots by recordIds as the stored JSONB, so a caller that forwards them pays no decode.
   * RecordIds not present in the store are silently omitted from the result.
   */
  querySnapshotsJSONB(
    recordIds: readonly number[],
  ): Effect.Effect<readonly { recordId: number; jsonb: Uint8Array }[], SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const sql = this.#sql;
      const results: { recordId: number; jsonb: Uint8Array }[] = [];
      for (const chunk of chunkArray(recordIds)) {
        const rows = yield* sql<{
          recordId: number;
          snapshot: StoredBlob;
        }>`SELECT recordId, snapshot FROM objectSnapshot WHERE recordId IN ${sql.in(chunk)}`;
        for (const row of rows) {
          results.push({ recordId: row.recordId, jsonb: toUint8Array(row.snapshot) });
        }
      }
      return results;
    });
  }

  /**
   * Each document object's JSONB with the heads it was read at, in one read so the two agree, and
   * the document's bytes where the host stored them. Objects stored without heads are omitted.
   */
  queryBackings(recordIds: readonly number[]): Effect.Effect<readonly ObjectBacking[], SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const sql = this.#sql;
      const results: ObjectBacking[] = [];
      for (const chunk of chunkArray(recordIds)) {
        const rows = yield* sql<{ recordId: number; snapshot: StoredBlob; heads: string; bytes: StoredBlob | null }>`
          SELECT recordId, snapshot, heads, bytes FROM objectSnapshot
          WHERE recordId IN ${sql.in(chunk)} AND heads IS NOT NULL`;
        for (const row of rows) {
          results.push({
            recordId: row.recordId,
            jsonb: toUint8Array(row.snapshot),
            heads: JSON.parse(row.heads),
            ...(row.bytes !== null && { bytes: toUint8Array(row.bytes) }),
          });
        }
      }
      return results;
    });
  }

  /**
   * Each document object's JSONB with the version it was read at, and its backing heads when a client can
   * back it. Objects stored without a version (feed blocks, and rows indexed before versions) are omitted.
   */
  querySnapshots(recordIds: readonly number[]): Effect.Effect<readonly ObjectSnapshot[], SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const sql = this.#sql;
      const results: ObjectSnapshot[] = [];
      for (const chunk of chunkArray(recordIds)) {
        const rows = yield* sql<{ recordId: number; snapshot: StoredBlob; heads: string | null; version: string }>`
          SELECT recordId, snapshot, heads, COALESCE(version, heads) AS version FROM objectSnapshot
          WHERE recordId IN ${sql.in(chunk)} AND COALESCE(version, heads) IS NOT NULL`;
        for (const row of rows) {
          results.push({
            recordId: row.recordId,
            jsonb: toUint8Array(row.snapshot),
            version: JSON.parse(row.version),
            heads: row.heads !== null ? JSON.parse(row.heads) : undefined,
          });
        }
      }
      return results;
    });
  }

  /**
   * How many indexed objects have no snapshot yet. Non-zero only while the store is filling after
   * its introduction; a reader that cannot tolerate a partial store waits for this to reach zero.
   * `spaceIds` narrows the count to those spaces, and `feeds: false` to document objects.
   */
  countMissingSnapshots(
    opts: { spaceIds?: readonly string[]; feeds?: boolean } = {},
  ): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const conditions: Statement.Fragment[] = [sql`s.recordId IS NULL`];
      if (opts.spaceIds) {
        conditions.push(sql.in('m.spaceId', opts.spaceIds));
      }
      if (opts.feeds === false) {
        conditions.push(sql`m.queueId = ''`);
      }
      const [row] = yield* sql<{ missing: number }>`
        SELECT COUNT(*) AS missing FROM objectMeta m LEFT JOIN objectSnapshot s ON s.recordId = m.recordId
        WHERE ${sql.and(conditions)}`;
      return row?.missing ?? 0;
    });
  }

  /**
   * How many snapshots belong to records stamped past `version` in `objectMeta`. A record's snapshot row is
   * written in the transaction that stamps its counter, so a counter without one names a deleted record.
   */
  countStampedSince(version: number): Effect.Effect<number, SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const [row] = yield* this.#sql<{ count: number }>`
        SELECT COUNT(*) AS count
        FROM objectMeta AS m
        JOIN objectSnapshot AS s ON s.recordId = m.recordId
        WHERE m.version > ${version}
      `;
      return row?.count ?? 0;
    });
  }

  /** Up to `limit` snapshots of records stamped past `version`, decoded, with their meta, in stamp order. */
  readStampedSince(
    version: number,
    limit: number,
  ): Effect.Effect<readonly { meta: EntityMeta; snapshot: Obj.JSON }[], SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const rows = yield* this.#sql<EntityMeta & { snapshot: StoredBlob }>`
        SELECT m.*, s.snapshot
        FROM objectMeta AS m
        JOIN objectSnapshot AS s ON s.recordId = m.recordId
        WHERE m.version > ${version}
        ORDER BY m.version
        LIMIT ${limit}
      `;
      // The row is handed on as the meta, snapshot column and all: copying it without that column costs more
      // than the decode on wide meta rows.
      return rows.map((row) => ({ meta: row, snapshot: decodeSnapshot(row.snapshot) }));
    });
  }

  /** Delete snapshot rows by record id. Used by garbage collection. */
  deleteByRecordIds = Effect.fn('ObjectSnapshotIndex.deleteByRecordIds')(
    (recordIds: readonly number[]): Effect.Effect<void, SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        for (const chunk of chunkArray(recordIds)) {
          yield* sql`DELETE FROM objectSnapshot WHERE recordId IN ${sql.in(chunk)}`;
        }
      }),
  );

  update = Effect.fn('ObjectSnapshotIndex.update')((objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError> =>
    Effect.gen({ self: this }, function* () {
      if (objects.length === 0) {
        return;
      }
      const sql = this.#sql;

      const pending: { recordId: number; object: IndexerObject }[] = [];
      for (const object of objects) {
        if (object.recordId === null) {
          return yield* Effect.die(new Error('ObjectSnapshotIndex.update requires recordId to be set'));
        }
        pending.push({ recordId: object.recordId, object });
      }

      // A partial block carries no `@type`/body — notably the `{ id, '@deleted': true }` tombstone
      // appended by `Feed.remove`. Feed blocks are stored wholesale, so such a block is merged onto
      // the prior snapshot to retain the body and type while layering the new marker; otherwise the
      // upsert would replace the full snapshot with the bare partial and the client could not hydrate
      // the deleted object (`Obj.fromJSON` needs `@type` to decode).
      // TODO(wittjosiah): Generalise to field-level LWW once partial-update blocks exist
      // (see `EchoFeedCodec.encode` and `EntityMetaIndex.update`).
      const isPartialBlock = ({ object }: { object: IndexerObject }) =>
        (object.data as Record<string, unknown>)[ATTR_TYPE] === undefined;

      const rows = pending.map(({ recordId, object }) => {
        const version = object.version ?? object.heads;
        return {
          recordId,
          snapshot: encodeSnapshot(object.data),
          heads: object.heads ? JSON.stringify(object.heads) : null,
          version: version ? JSON.stringify(version) : null,
          bytes: object.heads && object.bytes ? object.bytes : null,
        };
      });
      const partial = new Set(pending.flatMap((entry, index) => (isPartialBlock(entry) ? [index] : [])));

      for (const chunk of chunkRows(rows.filter((_, index) => !partial.has(index)))) {
        yield* sql`
            INSERT INTO objectSnapshot ${sql.insert(chunk)}
            ON CONFLICT (recordId) DO UPDATE SET snapshot = excluded.snapshot, heads = excluded.heads, version = excluded.version, bytes = excluded.bytes
          `;
      }

      // A partial block is stored as is where there is no prior row; otherwise each of its keys replaces the
      // prior value in place, as an object spread would, without reading the row back. Re-applying the keys to a
      // row the insert just wrote is a no-op, so the merge needs no branch on which case occurred.
      for (const index of partial) {
        const row = rows[index];
        yield* sql`
            INSERT INTO objectSnapshot ${sql.insert(row)}
            ON CONFLICT (recordId) DO UPDATE SET heads = excluded.heads, version = excluded.version, bytes = excluded.bytes
          `;
        const data = pending[index].object.data;
        if (Object.keys(data).every(isPathSafeKey)) {
          for (const merge of mergeExpressions(sql, data)) {
            yield* sql`UPDATE objectSnapshot SET snapshot = ${merge} WHERE recordId = ${row.recordId}`;
          }
        } else {
          const [stored] = yield* sql<{
            snapshot: StoredBlob;
          }>`SELECT snapshot FROM objectSnapshot WHERE recordId = ${row.recordId}`;
          const merged = encodeSnapshot({ ...decodeSnapshot(stored.snapshot), ...data });
          yield* sql`UPDATE objectSnapshot SET snapshot = ${merged} WHERE recordId = ${row.recordId}`;
        }
      }
    }),
  );
}

/** A document object's JSONB with the heads it was read at, and those heads again when a client can back it. */
export type ObjectSnapshot = { recordId: number; jsonb: Uint8Array; version: string[]; heads?: string[] };

/** An object's JSONB with the heads it was read at, and its document's bytes when the host stored them. */
export type ObjectBacking = { recordId: number; jsonb: Uint8Array; heads: string[]; bytes?: Uint8Array };

/**
 * A stored snapshot. SQLite drivers hand a BLOB back as a `Uint8Array` (node, wa-sqlite) or an `ArrayBuffer`
 * (Durable Object storage); a string is JSON text from a build older than migration `0005_snapshot_jsonb` that wrote
 * to this store after it was migrated (a rollback, then a roll forward).
 */
type StoredBlob = Uint8Array | ArrayBuffer | string;

const toUint8Array = (blob: StoredBlob): Uint8Array =>
  typeof blob === 'string'
    ? (Jsonb.encode(JSON.parse(blob)) ?? failedInvariant('a stored snapshot always encodes'))
    : blob instanceof Uint8Array
      ? blob
      : new Uint8Array(blob);

const encodeSnapshot = (data: Obj.JSON): Uint8Array =>
  Jsonb.encode(data) ?? failedInvariant('an object always encodes');

/** Key/value pairs per `jsonb_set` call, which bounds the statement's variables well under SQLite's limit. */
const MERGE_PAIRS_PER_STATEMENT = 20;

/**
 * Whether a key can be written as a quoted SQLite JSON path label, which takes every character literally up to the
 * closing `"` and has no escape for one; `\\` is merged in JS too, since only newer SQLite reads it literally, and
 * NUL because SQLite ends the path there.
 */
const isPathSafeKey = (key: string): boolean => !key.includes('"') && !key.includes('\\') && !key.includes('\u0000');

/**
 * Expressions that apply a partial object's keys to `snapshot` with object-spread semantics: each present key
 * replaces its prior value whole, and a key whose value `JSON.stringify` would drop removes the prior one.
 */
const mergeExpressions = (sql: SqlClient.SqlClient, data: Record<string, unknown>): Statement.Fragment[] => {
  const sets: Statement.Fragment[] = [];
  const removes: Statement.Fragment[] = [];
  for (const [key, value] of Object.entries(data)) {
    const path = `$."${key}"`;
    const encoded = Jsonb.encode(value);
    if (encoded === undefined) {
      removes.push(sql`${path}`);
    } else {
      sets.push(sql`${path}`, sql`jsonb(${encoded})`);
    }
  }
  const join = sql.join(', ', false);
  return [
    ...chunkArray(sets, MERGE_PAIRS_PER_STATEMENT * 2).map((pairs) => sql`jsonb_set(snapshot, ${join(pairs)})`),
    ...chunkArray(removes, MERGE_PAIRS_PER_STATEMENT).map((paths) => sql`jsonb_remove(snapshot, ${join(paths)})`),
  ];
};

/** A stored snapshot as the object it encodes. */
export const decodeSnapshot = (blob: StoredBlob): Obj.JSON => {
  const value = typeof blob === 'string' ? JSON.parse(blob) : Jsonb.decode(toUint8Array(blob));
  if (!isObjectJson(value)) {
    throw new TypeError('objectSnapshot row does not hold an object');
  }
  return value;
};

const isObjectJson = (value: unknown): value is Obj.JSON =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && typeof Reflect.get(value, 'id') === 'string';
