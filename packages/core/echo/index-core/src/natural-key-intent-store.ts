//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { type SpaceId } from '@dxos/keys';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/natural-key-intents';

/**
 * Durable write-ahead intents for natural-key merging.
 *
 * Not an index: the table holds merge-workflow state, not derived data. It lives in the index
 * database anyway because the coupling is transactional — an intent must commit atomically with
 * the index-cursor advance it guards (see `IndexEngine.#update`); if the cursor advanced and the
 * intent write lived in a different store, a crash between the two would lose the detection
 * forever, since that keyed write is never re-presented to the indexing loop.
 */
export class NaturalKeyIntentStore {
  /**
   * Applies any migrations this database has not recorded yet.
   *
   * `SqlTransaction.clientLayer` is provided because the migrator wraps its work in the client's
   * `withTransaction`, which emits `BEGIN` / `COMMIT` — rejected in workerd.
   */
  migrate = Effect.fn('NaturalKeyIntentStore.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      Effect.provide(SqlTransaction.clientLayer),
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
    ),
  );

  /**
   * Durably queue natural keys for duplicate detection. Runs inside the same transaction that
   * commits the index rows and cursors (see `IndexEngine.#update`), so a keyed write can never
   * be indexed-but-forgotten: until the merge pass services the key and clears the intent, every
   * later pass re-presents it.
   */
  record = Effect.fn('NaturalKeyIntentStore.record')(
    (
      intents: readonly { spaceId: SpaceId; naturalKey: string }[],
    ): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (intents.length === 0) {
          return;
        }
        const sql = yield* SqlClient.SqlClient;
        for (const { spaceId, naturalKey } of intents) {
          yield* sql`INSERT INTO naturalKeyIntents (spaceId, naturalKey) VALUES (${spaceId}, ${naturalKey})`;
        }
      }),
  );

  /**
   * All pending natural-key intents, deduplicated per space, with the high-water id to pass back
   * to {@link clear} — intents recorded after this read have larger ids and survive the clear,
   * so a concurrent indexing pass cannot have its trigger erased.
   */
  take = Effect.fn('NaturalKeyIntentStore.take')(
    (): Effect.Effect<{ maxId: number; intents: Map<SpaceId, Set<string>> }, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql<{ id: number; spaceId: SpaceId; naturalKey: string }>`
          SELECT id, spaceId, naturalKey FROM naturalKeyIntents`;
        let maxId = 0;
        const intents = new Map<SpaceId, Set<string>>();
        for (const { id, spaceId, naturalKey } of rows) {
          maxId = Math.max(maxId, id);
          const keys = intents.get(spaceId) ?? new Set();
          keys.add(naturalKey);
          intents.set(spaceId, keys);
        }
        return { maxId, intents };
      }),
  );

  /**
   * Clear a serviced natural-key intent, bounded by the id captured at read time.
   */
  clear = Effect.fn('NaturalKeyIntentStore.clear')(
    (
      spaceId: SpaceId,
      naturalKey: string,
      upToId: number,
    ): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM naturalKeyIntents WHERE spaceId = ${spaceId} AND naturalKey = ${naturalKey} AND id <= ${upToId}`;
      }),
  );
}
