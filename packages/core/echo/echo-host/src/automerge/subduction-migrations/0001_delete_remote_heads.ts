//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { RuntimeProvider } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { SUBDUCTION_PREFIX, descendantRange, encodeKey } from '../sqlite-storage-adapter.ts';
import { type Migration } from './index.ts';

/**
 * Run once on every profile: deletes the stored remote-heads records, which a long-lived profile
 * collected one per document per edge restart, and vacuums the file so the space comes back. See
 * {@link deleteSubductionRemoteHeads} for why nothing is lost.
 */
export const deleteRemoteHeads: Migration = {
  name: '0001_delete_remote_heads',
  run: async ({ storage }) => {
    const { deleted, reclaimedBytes } = await RuntimeProvider.runPromise(storage.runtime)(
      deleteSubductionRemoteHeads(),
    );
    log.info('subduction remote heads deleted', { deleted, reclaimedBytes });
    return true;
  },
};

export type DeleteSubductionRemoteHeadsOptions = {
  /**
   * Rows per statement when deleting in place. Bounds each transaction (and so the WAL) and sets how often progress
   * is reported.
   */
  batchSize?: number;
  /**
   * Whether to `VACUUM` after deleting, if the file has free pages. A delete only moves pages to SQLite's freelist;
   * the file keeps its size (700 MB on a bloated profile) until a vacuum rewrites it, which needs about that much
   * free space. Default `true`; a caller that vacuums on its own schedule passes `false`.
   */
  vacuum?: boolean;
  /**
   * Called once the total is known (`deleted: 0`), then after every batch, or once when a rebuild commits. Not called
   * when there is nothing to delete.
   */
  onProgress?: (progress: { deleted: number; total: number }) => void;
};

export type DeleteSubductionRemoteHeadsResult = {
  /** Records deleted. */
  deleted: number;
  /** Bytes the database shrank by in the vacuum that followed; `0` when no vacuum ran. */
  reclaimedBytes: number;
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
 * Deleting only moves pages to SQLite's freelist, so the file is then vacuumed (see `vacuum`) — gated on the
 * freelist, not on this run's count, so a run interrupted between the delete and the vacuum finishes the job when
 * rerun. A vacuum that fails propagates: the caller must not record the repair as done.
 */
export const deleteSubductionRemoteHeads = ({
  batchSize = 100_000,
  vacuum = true,
  onProgress,
}: DeleteSubductionRemoteHeadsOptions = {}): Effect.Effect<
  DeleteSubductionRemoteHeadsResult,
  SqlError.SqlError,
  SqlClient.SqlClient
> =>
  Effect.gen(function* () {
    const deleted = yield* deleteRecords({ batchSize, onProgress });
    const reclaimedBytes = vacuum ? yield* vacuumFreePages : 0;
    return { deleted, reclaimedBytes };
  }).pipe(Effect.withSpan('deleteSubductionRemoteHeads'));

/**
 * Rewrites the database without its free pages, when it has any, and reports how much it shrank. Not inside a
 * transaction: SQLite refuses `VACUUM` there. The WAL checkpoint after it is what shrinks the main file on disk in
 * WAL mode (the app's OPFS default); it is a no-op under a rollback journal.
 */
const vacuumFreePages: Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const [{ freelist }] = yield* sql<{
    freelist: number;
  }>`SELECT freelist_count AS freelist FROM pragma_freelist_count()`;
  if (freelist === 0) {
    return 0;
  }
  const fileBytes = Effect.map(
    sql<{ bytes: number }>`SELECT page_count * page_size AS bytes FROM pragma_page_count(), pragma_page_size()`,
    ([row]) => row.bytes,
  );
  const before = yield* fileBytes;
  yield* sql`VACUUM`;
  yield* sql`PRAGMA wal_checkpoint(TRUNCATE)`;
  const after = yield* fileBytes;
  return Math.max(0, before - after);
}).pipe(Effect.withSpan('deleteSubductionRemoteHeads.vacuum'));

/**
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
const deleteRecords = ({
  batchSize,
  onProgress,
}: {
  batchSize: number;
  onProgress?: DeleteSubductionRemoteHeadsOptions['onProgress'];
}): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
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
      return 0;
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
      return total;
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
    return deleted;
  });
