//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { Feed } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';

import { type FeedOptionsIntent } from './indexer-intent.ts';
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/feed-options-intents/index.ts';

const FeedOptionsJson = Schema.fromJsonString(Feed.FeedOptions);

/**
 * Durable write-ahead intents to apply a Feed object's indexing and retention options to the feed
 * store, the sibling of {@link ConvergenceKeyIntentStore}.
 *
 * It lives in the index database because the coupling is transactional: an intent commits with the
 * index rows of the Feed object it was derived from, so no later than the cursor that passes the
 * object, and the object is never re-presented once that cursor has moved on.
 */
export class FeedOptionsIntentStore {
  readonly #sql: SqlClient.SqlClient;

  constructor(sql: SqlClient.SqlClient) {
    this.#sql = sql;
  }

  /**
   * Applies any migrations this database has not recorded yet.
   */
  migrate = Effect.fn('FeedOptionsIntentStore.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
      Effect.provideService(SqlClient.SqlClient, this.#sql),
    ),
  );

  /**
   * Durably queues feed options to apply. Runs inside the transaction that commits the Feed objects'
   * index rows (see `IndexEngine.#writeTransaction`).
   *
   * Replaces the feed's pending row, so the table holds at most one row per Feed object however often
   * it is re-indexed; the new row takes a larger id, so a concurrent `clear` up to the old id keeps it.
   */
  record = Effect.fn('FeedOptionsIntentStore.record')(
    (intents: readonly FeedOptionsIntent[]): Effect.Effect<void, SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        for (const { spaceId, feedId, namespace, options } of intents) {
          yield* sql`DELETE FROM feedOptionsIntents WHERE spaceId = ${spaceId} AND feedId = ${feedId}`;
          yield* sql`INSERT INTO feedOptionsIntents (spaceId, feedId, namespace, options) VALUES (${spaceId}, ${feedId}, ${namespace}, ${JSON.stringify(options)})`;
        }
      }),
  );

  /**
   * The newest pending intent per feed, with the high-water id to pass back to {@link clear}: only
   * the current options matter, and an intent recorded after this read has a larger id, so it
   * survives the clear.
   */
  take = Effect.fn('FeedOptionsIntentStore.take')(
    (): Effect.Effect<{ maxId: number; intents: FeedOptionsIntent[] }, SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        const rows = yield* sql<{ id: number; spaceId: SpaceId; feedId: string; namespace: string; options: string }>`
          SELECT intent.id, intent.spaceId, intent.feedId, intent.namespace, intent.options
          FROM feedOptionsIntents AS intent
          JOIN (
            SELECT MAX(id) AS id FROM feedOptionsIntents GROUP BY spaceId, feedId
          ) AS newest ON intent.id = newest.id
          ORDER BY intent.id ASC`;
        let maxId = 0;
        const intents: FeedOptionsIntent[] = [];
        for (const { id, spaceId, feedId, namespace, options } of rows) {
          maxId = Math.max(maxId, id);
          intents.push({
            kind: 'feed-options',
            spaceId,
            feedId,
            namespace,
            // Rows are written from decoded options, so this falls back only on a row edited by hand.
            options: Option.getOrElse(Schema.decodeUnknownOption(FeedOptionsJson)(options), () => ({})),
          });
        }
        return { maxId, intents };
      }),
  );

  /**
   * Clears a feed's applied intents, bounded by the id {@link take} returned.
   */
  clear = Effect.fn('FeedOptionsIntentStore.clear')(
    (spaceId: SpaceId, feedId: string, upToId: number): Effect.Effect<void, SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        yield* sql`DELETE FROM feedOptionsIntents WHERE spaceId = ${spaceId} AND feedId = ${feedId} AND id <= ${upToId}`;
      }),
  );
}
