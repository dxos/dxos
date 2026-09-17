//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import type { SpaceId } from '@dxos/keys';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/activity/index.ts';
import type { ChangeSummary } from './interface.ts';

const HOUR_MS = 3_600_000;

/** One hour bucket of a space's activity ledger. */
export type ActivityRow = {
  readonly hour: number;
  readonly changes: number;
  readonly ops: number;
};

/**
 * Tracks how many Automerge changes (and ops) happened in each space per UTC hour.
 *
 * The ledger is append-only and never dropped, because the fact that a change happened at a
 * time is immutable.
 */
export class ActivityIndex {
  /**
   * Applies any migrations this database has not recorded yet.
   */
  migrate = Effect.fn('ActivityIndex.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A malformed bundled manifest is a defect, not something a caller can recover from.
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
    ),
  );

  /** Bucket and accumulate changes into the ledger, one upsert per `(spaceId, hour)`. */
  record = Effect.fn('ActivityIndex.record')(
    (changes: readonly ChangeSummary[]): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        if (changes.length === 0) {
          return;
        }
        const sql = yield* SqlClient.SqlClient;

        const buckets = new Map<string, { spaceId: SpaceId; hour: number; changes: number; ops: number }>();
        for (const change of changes) {
          const hour = Math.floor(change.time / HOUR_MS);
          const key = `${change.spaceId}/${hour}`;
          const bucket = buckets.get(key) ?? { spaceId: change.spaceId, hour, changes: 0, ops: 0 };
          bucket.changes += 1;
          bucket.ops += change.ops;
          buckets.set(key, bucket);
        }

        yield* Effect.forEach(
          buckets.values(),
          (bucket) => sql`
            INSERT INTO activity (spaceId, hour, changes, ops)
            VALUES (${bucket.spaceId}, ${bucket.hour}, ${bucket.changes}, ${bucket.ops})
            ON CONFLICT(spaceId, hour) DO UPDATE SET changes = changes + excluded.changes, ops = ops + excluded.ops
          `,
          { discard: true },
        );
      }),
  );

  /** Hour buckets for one space, ordered ascending, optionally bounded by a unix-ms range. */
  query = Effect.fn('ActivityIndex.query')(
    ({
      spaceId,
      from,
      to,
    }: {
      spaceId: string;
      from?: number;
      to?: number;
    }): Effect.Effect<readonly ActivityRow[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const fromHour = from === undefined ? null : Math.floor(from / HOUR_MS);
        const toHour = to === undefined ? null : Math.ceil(to / HOUR_MS);

        const rows = yield* sql<ActivityRow>`
          SELECT hour, changes, ops FROM activity
          WHERE spaceId = ${spaceId}
          AND (${fromHour} IS NULL OR hour >= ${fromHour})
          AND (${toHour} IS NULL OR hour < ${toHour})
          ORDER BY hour ASC
        `;
        return rows;
      }),
  );
}
