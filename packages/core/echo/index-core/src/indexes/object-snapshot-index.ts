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
          snapshot: string;
        }>`SELECT recordId, snapshot FROM objectSnapshot WHERE recordId IN ${sql.in(chunk)}`;
        for (const row of rows) {
          results.push({ recordId: row.recordId, snapshot: JSON.parse(row.snapshot) });
        }
      }

      return results;
    });
  }

  /**
   * Each document object's JSON text with the heads it was read at, in one read so the two agree, and
   * the document's bytes where the host stored them. Objects stored without heads are omitted.
   */
  queryBackings(recordIds: readonly number[]): Effect.Effect<readonly ObjectBacking[], SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const sql = this.#sql;
      const results: ObjectBacking[] = [];
      for (const chunk of chunkArray(recordIds)) {
        const rows = yield* sql<{ recordId: number; snapshot: string; heads: string; bytes: StoredBlob | null }>`
          SELECT recordId, snapshot, heads, bytes FROM objectSnapshot
          WHERE recordId IN ${sql.in(chunk)} AND heads IS NOT NULL`;
        for (const row of rows) {
          results.push({
            recordId: row.recordId,
            json: row.snapshot,
            heads: JSON.parse(row.heads),
            ...(row.bytes !== null && { bytes: toUint8Array(row.bytes) }),
          });
        }
      }
      return results;
    });
  }

  /**
   * Each document object's JSON text with the version it was read at, and its backing heads when a client can
   * back it. Objects stored without a version (feed blocks, and rows indexed before versions) are omitted.
   */
  querySnapshots(recordIds: readonly number[]): Effect.Effect<readonly ObjectSnapshot[], SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const sql = this.#sql;
      const results: ObjectSnapshot[] = [];
      for (const chunk of chunkArray(recordIds)) {
        const rows = yield* sql<{ recordId: number; snapshot: string; heads: string | null; version: string }>`
          SELECT recordId, snapshot, heads, COALESCE(version, heads) AS version FROM objectSnapshot
          WHERE recordId IN ${sql.in(chunk)} AND COALESCE(version, heads) IS NOT NULL`;
        for (const row of rows) {
          results.push({
            recordId: row.recordId,
            json: row.snapshot,
            version: JSON.parse(row.version),
            heads: row.heads !== null ? JSON.parse(row.heads) : undefined,
          });
        }
      }
      return results;
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

  /** Up to `limit` snapshots of records stamped past `version`, parsed, with their meta, in stamp order. */
  readStampedSince(
    version: number,
    limit: number,
  ): Effect.Effect<readonly { meta: EntityMeta; snapshot: Obj.JSON }[], SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const rows = yield* this.#sql<EntityMeta & { snapshot: string }>`
        SELECT m.*, s.snapshot
        FROM objectMeta AS m
        JOIN objectSnapshot AS s ON s.recordId = m.recordId
        WHERE m.version > ${version}
        ORDER BY m.version
        LIMIT ${limit}
      `;
      // The row is handed on as the meta, snapshot column and all: copying it without that column costs more
      // than the parse on wide meta rows.
      return rows.map((row) => ({ meta: row, snapshot: JSON.parse(row.snapshot) }));
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

      // A partial block carries no `@type`/body - notably the `{ id, '@deleted': true }` tombstone
      // appended by `Feed.remove`. Feed blocks are stored wholesale, so such a block is merged onto
      // the prior snapshot below to retain the body and type while layering the new marker;
      // otherwise the upsert would replace the full snapshot with the bare partial and the client
      // could not hydrate the deleted object (`Obj.fromJSON` needs `@type` to decode). Only those
      // blocks need the prior row, so the common case reads nothing at all.
      // TODO(wittjosiah): Generalise to field-level LWW once partial-update blocks exist
      // (see `EchoFeedCodec.encode` and `EntityMetaIndex.update`).
      const isPartialBlock = ({ object }: { object: IndexerObject }) =>
        (object.data as Record<string, unknown>)[ATTR_TYPE] === undefined;
      const partial = pending.filter(isPartialBlock).map(({ recordId }) => recordId);
      const prior = new Map<number, string>();
      for (const chunk of chunkArray(partial)) {
        const rows = yield* sql<{
          recordId: number;
          snapshot: string;
        }>`SELECT recordId, snapshot FROM objectSnapshot WHERE recordId IN ${sql.in(chunk)}`;
        for (const row of rows) {
          prior.set(row.recordId, row.snapshot);
        }
      }

      const rows = pending.map(({ recordId, object }) => {
        const existing = prior.get(recordId);
        const merged =
          isPartialBlock({ object }) && existing !== undefined
            ? { ...(JSON.parse(existing) as Record<string, unknown>), ...object.data }
            : object.data;
        const version = object.version ?? object.heads;
        return {
          recordId,
          snapshot: JSON.stringify(merged),
          heads: object.heads ? JSON.stringify(object.heads) : null,
          version: version ? JSON.stringify(version) : null,
          bytes: object.heads && object.bytes ? object.bytes : null,
        };
      });

      for (const chunk of chunkRows(rows)) {
        yield* sql`
            INSERT INTO objectSnapshot ${sql.insert(chunk)}
            ON CONFLICT (recordId) DO UPDATE SET snapshot = excluded.snapshot, heads = excluded.heads, version = excluded.version, bytes = excluded.bytes
          `;
      }
    }),
  );
}

/** A document object's JSON with the heads it was read at, and those heads again when a client can back it. */
export type ObjectSnapshot = { recordId: number; json: string; version: string[]; heads?: string[] };

/** An object's JSON with the heads it was read at, and its document's bytes when the host stored them. */
export type ObjectBacking = { recordId: number; json: string; heads: string[]; bytes?: Uint8Array };

/** SQLite drivers hand a BLOB back as a `Uint8Array` (node, wa-sqlite) or an `ArrayBuffer` (Durable Object storage). */
type StoredBlob = Uint8Array | ArrayBuffer;

const toUint8Array = (blob: StoredBlob): Uint8Array => (blob instanceof Uint8Array ? blob : new Uint8Array(blob));
