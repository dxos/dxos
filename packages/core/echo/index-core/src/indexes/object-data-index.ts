//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import type { Obj } from '@dxos/echo';
import { ATTR_TYPE } from '@dxos/echo/internal';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/object-data/index.ts';
import { chunkArray } from '../utils.ts';
import type { Index, IndexerObject } from './interface.ts';

/**
 * Stores the full ObjectJSON of every indexed object as JSONB, keyed by `objectMeta.recordId`.
 * This is the body the query compiler predicates on, so unlike the full-text snapshot it keeps
 * `@meta` (key, foreign keys, tags) and is never stripped.
 */
export class ObjectDataIndex implements Index {
  /**
   * Applies any migrations this database has not recorded yet.
   */
  migrate = Effect.fn('ObjectDataIndex.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
    ),
  );

  update = Effect.fn('ObjectDataIndex.update')(
    (objects: IndexerObject[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* Effect.forEach(
          objects,
          (object) =>
            Effect.gen(function* () {
              const { recordId, data } = object;
              if (recordId === null) {
                return yield* Effect.die(new Error('ObjectDataIndex.update requires recordId to be set'));
              }

              // A partial feed block (the `{ id, '@deleted': true }` tombstone) carries no `@type` or
              // body; layer it onto the prior body so the object stays decodable, as the full-text
              // snapshot does. Full blocks replace wholesale.
              const isPartialBlock = (data as Record<string, unknown>)[ATTR_TYPE] === undefined;
              let body: unknown = data;
              if (isPartialBlock) {
                const existing = yield* sql<{ body: string }>`
                  SELECT json(body) AS body FROM objectData WHERE recordId = ${recordId}`;
                if (existing.length > 0) {
                  body = { ...(JSON.parse(existing[0].body) as Record<string, unknown>), ...data };
                }
              }

              yield* sql`
                INSERT INTO objectData (recordId, body) VALUES (${recordId}, jsonb(${JSON.stringify(body)}))
                ON CONFLICT(recordId) DO UPDATE SET body = excluded.body`;
            }),
          { discard: true },
        );
      }),
  );

  /**
   * Bodies by record id, parsed. Record ids without a body are omitted.
   */
  queryBodies = Effect.fn('ObjectDataIndex.queryBodies')(
    (
      recordIds: readonly number[],
    ): Effect.Effect<readonly { recordId: number; snapshot: Obj.JSON }[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (recordIds.length === 0) {
          return [];
        }
        const sql = yield* SqlClient.SqlClient;
        const results: { recordId: number; snapshot: Obj.JSON }[] = [];
        for (const chunk of chunkArray(recordIds)) {
          const rows = yield* sql<{ recordId: number; body: string }>`
            SELECT recordId, json(body) AS body FROM objectData WHERE ${sql.in('recordId', chunk)}`;
          for (const row of rows) {
            results.push({ recordId: row.recordId, snapshot: JSON.parse(row.body) });
          }
        }
        return results;
      }),
  );

  /**
   * Number of `objectMeta` rows without a body. Non-zero while the backfill that follows this
   * store's introduction is still running; queries must not read the compiled path until it is zero.
   */
  countMissingBodies = Effect.fn('ObjectDataIndex.countMissingBodies')(
    (): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const [{ missing }] = yield* sql<{ missing: number }>`
          SELECT count(*) AS missing FROM objectMeta m LEFT JOIN objectData d ON d.recordId = m.recordId
          WHERE d.recordId IS NULL`;
        return missing;
      }),
  );

  /** Delete bodies by record id. Used by garbage collection. */
  deleteByRecordIds = Effect.fn('ObjectDataIndex.deleteByRecordIds')(
    (recordIds: readonly number[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        for (const chunk of chunkArray(recordIds)) {
          yield* sql`DELETE FROM objectData WHERE ${sql.in('recordId', chunk)}`;
        }
      }),
  );
}
