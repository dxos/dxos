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
import { chunkArray } from '../utils.ts';
import type { DerivedIndex, Index, IndexerObject } from './interface.ts';

/**
 * The JSON of every indexed object, keyed by its `objectMeta` record id.
 *
 * This is the row store: every query that reads object data reads it here, so it is written on the
 * indexing pass itself and is never behind the data source. Indexes derived from it — currently
 * the full-text index — are marked dirty in the same transaction and rebuild on their own
 * schedule, which is what lets an expensive one lag without a reader observing a stale row.
 */
export class ObjectSnapshotIndex implements Index {
  readonly #derived: readonly DerivedIndex[];

  /**
   * @param derived Indexes rebuilt from this store, notified of every row this pass writes.
   */
  constructor(derived: readonly DerivedIndex[] = []) {
    this.#derived = derived;
  }

  /**
   * Applies any migrations this database has not recorded yet.
   */
  migrate = Effect.fn('ObjectSnapshotIndex.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
    ),
  );

  /**
   * Query snapshots by recordIds.
   * Returns the parsed JSON snapshots for queue objects.
   * RecordIds not present in the store are silently omitted from the result.
   */
  querySnapshotsJSON(
    recordIds: number[],
  ): Effect.Effect<readonly { recordId: number; snapshot: Obj.JSON }[], SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(function* () {
      if (recordIds.length === 0) {
        return [];
      }
      const sql = yield* SqlClient.SqlClient;

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

  /** Delete snapshot rows by record id. Used by garbage collection. */
  deleteByRecordIds = Effect.fn('ObjectSnapshotIndex.deleteByRecordIds')(
    (recordIds: readonly number[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        for (const chunk of chunkArray(recordIds)) {
          yield* sql`DELETE FROM objectSnapshot WHERE recordId IN ${sql.in(chunk)}`;
        }
      }),
  );

  update = Effect.fn('ObjectSnapshotIndex.update')(
    (objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen({ self: this }, function* () {
        const sql = yield* SqlClient.SqlClient;
        const written: number[] = [];

        yield* Effect.forEach(
          objects,
          (object) =>
            Effect.gen(function* () {
              const { recordId, data } = object;
              if (recordId === null) {
                return yield* Effect.die(new Error('ObjectSnapshotIndex.update requires recordId to be set'));
              }

              const existing = yield* sql<{
                snapshot: string;
              }>`SELECT snapshot FROM objectSnapshot WHERE recordId = ${recordId}`;

              // A partial block carries no `@type`/body — notably the `{ id, '@deleted': true }`
              // tombstone appended by `Feed.remove`. Feed blocks are stored wholesale, so merge the
              // partial onto the prior snapshot to retain the body and type while layering the new
              // marker; otherwise the upsert below would replace the full snapshot with the bare
              // partial and the client could not hydrate the deleted object (`Obj.fromJSON` needs
              // `@type` to decode). Full blocks (carrying `@type`) still replace wholesale.
              // TODO(wittjosiah): Generalise to field-level LWW once partial-update blocks exist
              // (see `EchoFeedCodec.encode` and `EntityMetaIndex.update`).
              const isPartialBlock = (data as Record<string, unknown>)[ATTR_TYPE] === undefined;
              const merged =
                isPartialBlock && existing.length > 0
                  ? { ...(JSON.parse(existing[0].snapshot) as Record<string, unknown>), ...data }
                  : data;
              // Document objects carry `@meta` only so the entity-meta index can extract the
              // convergence key, and this store is what the full-text index is built from — so
              // keeping it would let a search match on foreign keys and identity strings the
              // visible content never contains. Queue blocks always carried meta in their snapshot
              // (clients hydrate from it), so theirs stays.
              const stored = object.documentId
                ? Object.fromEntries(Object.entries(merged).filter(([key]) => key !== ATTR_META))
                : merged;

              yield* sql`
                INSERT INTO objectSnapshot (recordId, snapshot) VALUES (${recordId}, ${JSON.stringify(stored)})
                ON CONFLICT (recordId) DO UPDATE SET snapshot = excluded.snapshot
              `;
              written.push(recordId);
            }),
          { discard: true },
        );

        // Marked in the same transaction as the write it describes; a crash in between would leave
        // a derived index stale with nothing left to re-present the record.
        yield* Effect.forEach(this.#derived, (index) => index.markDirty(written), { discard: true });
      }),
  );
}
