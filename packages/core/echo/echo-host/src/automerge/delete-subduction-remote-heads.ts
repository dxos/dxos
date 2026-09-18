//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { invariant } from '@dxos/invariant';

import { SUBDUCTION_PREFIX, descendantRange, encodeKey } from './sqlite-storage-adapter.ts';

export type DeleteSubductionRemoteHeadsOptions = {
  /**
   * Rows per statement when deleting in place. Bounds each transaction (and so the WAL) and sets how often progress
   * is reported.
   */
  batchSize?: number;
  /**
   * Called once the total is known (`deleted: 0`), then after every batch, or once when a rebuild commits. Not called
   * when there is nothing to delete.
   */
  onProgress?: (progress: { deleted: number; total: number }) => void;
};

/**
 * Deletes every stored Subduction remote-heads record — `[SUBDUCTION_PREFIX, 'remote-heads', <sedimentreeId>,
 * <peerId>]`, one per document per remote peer it has synced with. A repair for profiles those records have bloated.
 *
 * The records cache what a peer last reported having. `SubductionSource` replays them when a document attaches (into
 * `getSyncInfo` and the handle's `remote-heads` event) and persists one again when a peer next reports heads.
 * The heads Subduction exchanges while syncing are computed from the local sedimentree, never read from here, so
 * deleting the records loses no document data and changes nothing about what gets synced. Edge used to come back
 * under a new Subduction identity after every restart, which is how a long-lived profile collects one record per
 * document per restart — the bulk of the table.
 *
 * Two strategies, picked by which side of the table is bigger:
 * - The records outnumber everything else (a bloated profile): the other rows are set aside, the table is emptied
 *   with an unqualified `DELETE`, and they are put back, in one transaction. SQLite's truncate optimization frees an
 *   unqualified delete's pages without visiting its rows, so the cost is one read of each page plus two copies of the
 *   kept rows. Deleting the records in place would rewrite nearly every table page per batch, because they are
 *   scattered across the table in insertion order: minutes of OPFS I/O on a 700 MB profile.
 * - Otherwise: deletes in key order, `batchSize` rows per statement, so an interrupted run keeps what it deleted and
 *   a rerun resumes. Each batch is cut at an existing key rather than selected with `IN (SELECT … LIMIT)`, which
 *   would materialize the batch in a temp B-tree.
 */
export const deleteSubductionRemoteHeads = ({
  batchSize = 100_000,
  onProgress,
}: DeleteSubductionRemoteHeadsOptions = {}): Effect.Effect<
  { deleted: number },
  SqlError.SqlError,
  SqlClient.SqlClient
> =>
  Effect.gen(function* () {
    invariant(Number.isInteger(batchSize) && batchSize > 0, 'batchSize must be a positive integer');
    const sql = yield* SqlClient.SqlClient;
    const { lower, upper } = descendantRange(encodeKey([SUBDUCTION_PREFIX, 'remote-heads']));
    const count = (rows: Effect.Effect<ReadonlyArray<{ n: number }>, SqlError.SqlError>) =>
      Effect.map(rows, ([row]) => row.n);
    const countRemaining = count(
      sql<{ n: number }>`SELECT count(*) AS n FROM automerge_chunks WHERE key >= ${lower} AND key < ${upper}`,
    );

    const total = yield* countRemaining;
    if (total === 0) {
      return { deleted: 0 };
    }
    onProgress?.({ deleted: 0, total });

    // Everything outside the range, as index range scans: an `OR` of the ranges would plan as a full table scan.
    // `key` can hold NULL (SQLite allows it in a non-INTEGER PRIMARY KEY), and a NULL key is outside the range too.
    const kept =
      (yield* count(sql<{ n: number }>`SELECT count(*) AS n FROM automerge_chunks WHERE key IS NULL`)) +
      (yield* count(sql<{ n: number }>`SELECT count(*) AS n FROM automerge_chunks WHERE key < ${lower}`)) +
      (yield* count(sql<{ n: number }>`SELECT count(*) AS n FROM automerge_chunks WHERE key >= ${upper}`));
    if (total >= kept) {
      yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* sql`DROP TABLE IF EXISTS automerge_chunks_repair`;
          yield* sql`CREATE TABLE automerge_chunks_repair AS SELECT key, data FROM automerge_chunks WHERE key IS NULL`;
          yield* sql`INSERT INTO automerge_chunks_repair SELECT key, data FROM automerge_chunks WHERE key < ${lower}`;
          yield* sql`INSERT INTO automerge_chunks_repair SELECT key, data FROM automerge_chunks WHERE key >= ${upper}`;
          // Unqualified, so SQLite frees whole pages instead of deleting row by row.
          yield* sql`DELETE FROM automerge_chunks`;
          yield* sql`INSERT INTO automerge_chunks (key, data) SELECT key, data FROM automerge_chunks_repair`;
          yield* sql`DROP TABLE automerge_chunks_repair`;
        }),
      );
      onProgress?.({ deleted: total, total });
      return { deleted: total };
    }

    let deleted = 0;
    while (true) {
      // The `batchSize`-th remaining key: everything from the start of the range up to it is exactly one batch.
      const [last] = yield* sql<{ key: string }>`
        SELECT key FROM automerge_chunks WHERE key >= ${lower} AND key < ${upper}
        ORDER BY key LIMIT 1 OFFSET ${batchSize - 1}
      `;
      if (last === undefined) {
        break;
      }
      yield* sql`DELETE FROM automerge_chunks WHERE key >= ${lower} AND key <= ${last.key}`;
      deleted += batchSize;
      onProgress?.({ deleted, total });
    }

    const remaining = yield* countRemaining;
    if (remaining > 0) {
      yield* sql`DELETE FROM automerge_chunks WHERE key >= ${lower} AND key < ${upper}`;
      deleted += remaining;
      onProgress?.({ deleted, total });
    }
    return { deleted };
  }).pipe(Effect.withSpan('deleteSubductionRemoteHeads'));
