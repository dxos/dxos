//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import type { Obj } from '@dxos/echo';
import { ATTR_META, ATTR_TYPE } from '@dxos/echo/internal';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/object-snapshot/index.ts';
import { chunkArray, chunkRows } from '../utils.ts';
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
   * How many indexed objects have no snapshot yet. Non-zero only while the store is filling after
   * its introduction; a reader that cannot tolerate a partial store waits for this to reach zero.
   */
  countMissingSnapshots(): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const [row] = yield* sql<{ missing: number }>`
        SELECT COUNT(*) AS missing FROM objectMeta m LEFT JOIN objectSnapshot s ON s.recordId = m.recordId
        WHERE s.recordId IS NULL`;
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

      // A partial block carries no `@type`/body — notably the `{ id, '@deleted': true }` tombstone
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
        // A document object's snapshot keeps `@meta`, so a query can be answered from it without
        // loading the document (the full-text index built from this store skips `@` keys). It is
        // written even when empty: rows from before snapshots kept it have none, and a reader
        // tells the two apart by it.
        const stored = object.documentId ? { ...merged, [ATTR_META]: merged[ATTR_META] ?? {} } : merged;
        return { recordId, snapshot: JSON.stringify(stored) };
      });

      for (const chunk of chunkRows(rows)) {
        yield* sql`
            INSERT INTO objectSnapshot ${sql.insert(chunk)}
            ON CONFLICT (recordId) DO UPDATE SET snapshot = excluded.snapshot
          `;
      }
    }),
  );
}
