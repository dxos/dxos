//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { Event } from '@dxos/async';
import { IndexEngine } from '@dxos/index-core';
import { FeedProtocol } from '@dxos/protocols';
import { type DataService } from '@dxos/protocols/rpc';

const IDLE: DataService.IndexStatus = { phase: 'idle', done: 0, total: 0 };

/** `remaining` items left in `progress`, growing its total to cover any that arrived since it was set; none once nothing remains. */
const advance = (
  progress: DataService.IndexProgress | undefined,
  remaining: number,
): DataService.IndexProgress | undefined => {
  if (remaining <= 0) {
    return undefined;
  }
  const total = Math.max(progress?.total ?? 0, (progress?.done ?? 0) + remaining);
  return { done: total - remaining, total };
};

const sameProgress = (a: DataService.IndexProgress | undefined, b: DataService.IndexProgress | undefined): boolean =>
  a?.done === b?.done && a?.total === b?.total;

/** `status` with `lane` set to `remaining` items, as {@link advance} grows it. */
const withLane = (
  status: DataService.IndexStatus,
  lane: 'catchUp' | 'fullText',
  remaining: number,
): DataService.IndexStatus => {
  const { [lane]: progress, ...rest } = status;
  const next = advance(progress, remaining);
  return next ? { ...rest, [lane]: next } : rest;
};

/** `status` with the rebuild set to `remaining` items, idle once none remain. */
const withRebuild = (status: DataService.IndexStatus, remaining: number): DataService.IndexStatus => {
  const { phase, done, total, ...lanes } = status;
  const rebuild = advance(phase === 'indexing' ? { done, total } : undefined, remaining);
  return rebuild ? { ...lanes, phase: 'indexing', ...rebuild } : { ...lanes, ...IDLE };
};

/** How often {@link IndexStatusTracker.afterPass} recounts the backlog while passes leave work behind. */
export const BACKLOG_RECOUNT_INTERVAL = 1_000;

/**
 * The host's current {@link DataService.IndexStatus}, with an event on each change. Each update
 * emits at most one status.
 */
export class IndexStatusTracker {
  readonly updated = new Event<DataService.IndexStatus>();

  #status = IDLE;

  /** Feed blocks past their cursor at the last count; a pass counts only its documents' catch-up. */
  #feedCatchUp = 0;

  #countedAt = Number.NEGATIVE_INFINITY;

  get current(): DataService.IndexStatus {
    return this.#status;
  }

  setMigrating(done: number, total: number): void {
    this.#set({ ...this.#status, phase: 'migrating', done, total });
  }

  /** Records the backlog counted once the stores open, which ends any migration. */
  opened(backlog: IndexBacklog): void {
    this.#countedAt = performance.now();
    this.#feedCatchUp = backlog.catchUp;
    this.#set(withLane(withRebuild(this.#status, backlog.rebuild), 'catchUp', backlog.catchUp));
  }

  /**
   * Moves the status on after a pass, which counted its documents' catch-up as it read, recounting the
   * backlog with `count` at most every {@link BACKLOG_RECOUNT_INTERVAL}. A drained pass ends the
   * rebuild and catch-up: a batch of documents that never load drains with work counted behind it,
   * and no pass follows.
   */
  async afterPass(
    { drained, catchUp }: { drained: boolean; catchUp: number },
    count: () => Promise<IndexBacklog>,
  ): Promise<void> {
    if (drained) {
      this.#feedCatchUp = 0;
      this.#set(withLane(withRebuild(this.#status, 0), 'catchUp', 0));
      return;
    }
    let status = this.#status;
    if (performance.now() - this.#countedAt >= BACKLOG_RECOUNT_INTERVAL) {
      this.#countedAt = performance.now();
      const backlog = await count();
      this.#feedCatchUp = backlog.catchUp;
      status = withRebuild(this.#status, backlog.rebuild);
    }
    this.#set(withLane(status, 'catchUp', catchUp + this.#feedCatchUp));
  }

  /** Records `remaining` objects the full-text index has not reached. */
  setFullText(remaining: number): void {
    this.#set(withLane(this.#status, 'fullText', remaining));
  }

  #set(status: DataService.IndexStatus): void {
    const current = this.#status;
    if (
      status.phase === current.phase &&
      status.done === current.done &&
      status.total === current.total &&
      sameProgress(status.catchUp, current.catchUp) &&
      sameProgress(status.fullText, current.fullText)
    ) {
      return;
    }
    this.#status = status;
    this.updated.emit(status);
  }
}

const SOURCE_AUTOMERGE = 'automerge';
const SOURCE_FEED = 'queue';
const FEED_NAMESPACES = [FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace];

/** What {@link countIndexBacklog} found the primary indexes have not reached. */
export type IndexBacklog = {
  /** Documents and feed blocks with no cursor to resume from, as after a cursor-resetting migration. */
  rebuild: number;
  /** Feed blocks past their feed's cursor, as after time offline. */
  catchUp: number;
};

/**
 * How much stored data the primary indexes have not reached, under whichever primary index is
 * furthest behind: documents with no cursor and feeds with no cursor are a rebuild, and blocks past an
 * existing feed cursor are catch-up.
 *
 * A document with a cursor but newer heads is not counted (heads are stored as a blob that SQL cannot
 * compare with a cursor); the indexing pass counts that catch-up as it reads.
 */
export const countIndexBacklog = (): Effect.Effect<IndexBacklog, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    // `NOT IN` evaluates the cursor list once; a correlated `NOT EXISTS` cannot use the cursor
    // table's key, which puts `spaceId` before `resourceId`, and was 200 times slower.
    let documents = 0;
    for (const indexName of IndexEngine.primaryIndexNames) {
      const [row] = yield* sql<{ count: number }>`
        SELECT COUNT(*) AS count FROM automerge_heads WHERE document_id NOT IN (
          SELECT resourceId FROM indexCursor WHERE indexName = ${indexName} AND sourceName = ${SOURCE_AUTOMERGE}
        )`;
      documents = Math.max(documents, row?.count ?? 0);
    }

    // A feed cursor is `<token>|<insertionId>` and covers every feed of one namespace in a space.
    let rebuild = documents;
    let catchUp = 0;
    const feeds = yield* sql<{ spaceId: string; feedNamespace: string }>`
      SELECT DISTINCT spaceId, feedNamespace FROM feeds WHERE ${sql.in('feedNamespace', FEED_NAMESPACES)}`;
    for (const { spaceId, feedNamespace } of feeds) {
      let behind = 0;
      let resumable = true;
      for (const indexName of IndexEngine.primaryIndexNames) {
        const [cursor] = yield* sql<{ cursor: string | null }>`
          SELECT cursor FROM indexCursor
          WHERE indexName = ${indexName} AND sourceName = ${SOURCE_FEED} AND spaceId = ${spaceId} AND resourceId = ${feedNamespace}`;
        const after = Number(cursor?.cursor?.split('|')[1] ?? Number.NaN);
        resumable &&= Number.isFinite(after);
        const [row] = yield* sql<{ count: number }>`
          SELECT COUNT(*) AS count FROM blocks b JOIN feeds f ON f.feedPrivateId = b.feedPrivateId
          WHERE f.spaceId = ${spaceId} AND f.feedNamespace = ${feedNamespace} AND b.insertionId > ${Number.isFinite(after) ? after : -1}`;
        behind = Math.max(behind, row?.count ?? 0);
      }
      if (resumable) {
        catchUp += behind;
      } else {
        rebuild += behind;
      }
    }

    return { rebuild, catchUp };
  });
