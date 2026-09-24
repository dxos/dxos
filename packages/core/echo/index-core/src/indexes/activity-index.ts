//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import type { SpaceId } from '@dxos/keys';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/activity/index.ts';
import { chunkArray } from '../utils.ts';
import type { DocumentActivity } from './interface.ts';

export const HOUR_MS = 3_600_000;

/** One document's changes in one UTC hour. */
export type ActivityRow = {
  readonly documentId: string;
  /** Start of the hour, unix ms. */
  readonly hour: number;
  readonly changes: number;
  readonly ops: number;
};

export type ActivityQuery = {
  spaceId: SpaceId;
  /** Restrict to these documents; all documents in the space when omitted. */
  documentIds?: readonly string[];
};

/**
 * Counts Automerge changes (and their ops) per document per UTC hour.
 *
 * Rows outlive their document: deleting an object does not undo the edits made to it, so garbage
 * collection leaves this index alone.
 */
export class ActivityIndex {
  readonly #sql: SqlClient.SqlClient;

  constructor(sql: SqlClient.SqlClient) {
    this.#sql = sql;
  }

  migrate = Effect.fn('ActivityIndex.migrate')(() =>
    Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      Effect.catchTag('MigrationError', (error) => Effect.die(error)),
      Effect.asVoid,
      Effect.provideService(SqlClient.SqlClient, this.#sql),
    ),
  );

  /** Accumulates each document's changes into its hour buckets; a `full` entry replaces the document's rows. */
  record = Effect.fn('ActivityIndex.record')(
    (activity: readonly DocumentActivity[]): Effect.Effect<void, SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        for (const entry of activity) {
          if (entry.full) {
            yield* sql`DELETE FROM activity WHERE spaceId = ${entry.spaceId} AND documentId = ${entry.documentId}`;
          }

          const buckets = new Map<number, { changes: number; ops: number }>();
          for (const change of entry.changes) {
            const hour = Math.floor(change.time / HOUR_MS);
            const bucket = buckets.get(hour) ?? { changes: 0, ops: 0 };
            bucket.changes += 1;
            bucket.ops += change.ops;
            buckets.set(hour, bucket);
          }

          yield* Effect.forEach(
            buckets,
            ([hour, bucket]) => sql`
              INSERT INTO activity (spaceId, documentId, hour, changes, ops)
              VALUES (${entry.spaceId}, ${entry.documentId}, ${hour}, ${bucket.changes}, ${bucket.ops})
              ON CONFLICT(spaceId, documentId, hour)
              DO UPDATE SET changes = changes + excluded.changes, ops = ops + excluded.ops
            `,
            { discard: true },
          );
        }
      }),
  );

  /** Hour buckets for one space, ordered by hour then document. */
  query = Effect.fn('ActivityIndex.query')(
    ({ spaceId, documentIds }: ActivityQuery): Effect.Effect<readonly ActivityRow[], SqlError.SqlError> =>
      Effect.gen({ self: this }, function* () {
        const sql = this.#sql;
        const select = (documents: readonly string[] | null) => sql<{
          documentId: string;
          hour: number;
          changes: number;
          ops: number;
        }>`
          SELECT documentId, hour, changes, ops FROM activity
          WHERE spaceId = ${spaceId}
          ${documents ? sql`AND documentId IN ${sql.in(documents)}` : sql``}
        `;

        const rows =
          documentIds === undefined
            ? yield* select(null)
            : (yield* Effect.forEach(chunkArray(documentIds), (chunk) => select(chunk))).flat();

        return rows
          .map((row) => ({ ...row, hour: row.hour * HOUR_MS }))
          .sort((a, b) => a.hour - b.hour || a.documentId.localeCompare(b.documentId));
      }),
  );
}
