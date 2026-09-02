//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { type SpaceId } from '@dxos/keys';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/convergence-key-intents';

/**
 * Durable write-ahead intents for convergence-key merging.
 *
 * An intent means "check whether the group named by this key needs merging", not "duplicates
 * exist": one is recorded for every keyed object the indexer processes, and the merge pass
 * services a group of one as a no-op before vacating the key's rows.
 *
 * Not an index: the table holds merge-workflow state, not derived data. It lives in the index
 * database anyway because the coupling is transactional — an intent must commit atomically with
 * the index-cursor advance it guards (see `IndexEngine.#update`); if the cursor advanced and the
 * intent write lived in a different store, a crash between the two would lose the detection
 * forever, since that keyed write is never re-presented to the indexing loop.
 */
export class ConvergenceKeyIntentStore {
  /**
   * Applies any migrations this database has not recorded yet.
   *
   * `SqlTransaction.clientLayer` is provided because the migrator wraps its work in the client's
   * `withTransaction`, which emits `BEGIN` / `COMMIT` — rejected in workerd.
   */
  migrate = Effect.fn('ConvergenceKeyIntentStore.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      Effect.provide(SqlTransaction.clientLayer),
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
    ),
  );

  /**
   * Durably queue convergence keys for duplicate detection. Runs inside the same transaction that
   * commits the index rows and cursors (see `IndexEngine.#update`), so a keyed write can never
   * be indexed-but-forgotten: until the merge pass services the key and clears the intent, every
   * later pass re-presents it.
   */
  record = Effect.fn('ConvergenceKeyIntentStore.record')(
    (
      intents: readonly { spaceId: SpaceId; convergenceKey: string }[],
    ): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (intents.length === 0) {
          return;
        }
        const sql = yield* SqlClient.SqlClient;
        for (const { spaceId, convergenceKey } of intents) {
          yield* sql`INSERT INTO convergenceKeyIntents (spaceId, convergenceKey) VALUES (${spaceId}, ${convergenceKey})`;
        }
      }),
  );

  /**
   * All pending convergence-key intents, deduplicated per space, with the high-water id to pass back
   * to {@link clear} — intents recorded after this read have larger ids and survive the clear,
   * so a concurrent indexing pass cannot have its trigger erased.
   */
  take = Effect.fn('ConvergenceKeyIntentStore.take')(
    (): Effect.Effect<{ maxId: number; intents: Map<SpaceId, Set<string>> }, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql<{ id: number; spaceId: SpaceId; convergenceKey: string }>`
          SELECT id, spaceId, convergenceKey FROM convergenceKeyIntents`;
        let maxId = 0;
        const intents = new Map<SpaceId, Set<string>>();
        for (const { id, spaceId, convergenceKey } of rows) {
          maxId = Math.max(maxId, id);
          const keys = intents.get(spaceId) ?? new Set();
          keys.add(convergenceKey);
          intents.set(spaceId, keys);
        }
        return { maxId, intents };
      }),
  );

  /**
   * Clear a serviced convergence-key intent, bounded by the id captured at read time.
   */
  clear = Effect.fn('ConvergenceKeyIntentStore.clear')(
    (
      spaceId: SpaceId,
      convergenceKey: string,
      upToId: number,
    ): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM convergenceKeyIntents WHERE spaceId = ${spaceId} AND convergenceKey = ${convergenceKey} AND id <= ${upToId}`;
      }),
  );
}
