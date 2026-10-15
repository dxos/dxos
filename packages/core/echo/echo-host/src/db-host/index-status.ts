//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { Event } from '@dxos/async';
import { IndexEngine } from '@dxos/index-core';
import { log } from '@dxos/log';
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

/** `status` with the rebuild set to `remaining` items, idle once none remain. */
const withRebuild = (status: DataService.IndexStatus, remaining: number): DataService.IndexStatus => {
  const rebuild = advance(
    status.phase === 'indexing' ? { done: status.done, total: status.total } : undefined,
    remaining,
  );
  return rebuild ? { phase: 'indexing', ...rebuild } : IDLE;
};

/** `activity` with `lane` set to `remaining` items, as {@link advance} grows it. */
const withLane = (
  activity: DataService.IndexActivity,
  lane: keyof DataService.IndexActivity,
  remaining: number,
): DataService.IndexActivity => {
  const { [lane]: progress, ...rest } = activity;
  const next = advance(progress, remaining);
  return next ? { ...rest, [lane]: next } : rest;
};

/** The rebuild a backlog count found: documents with no cursor and feed blocks stored before the host opened. */
const rebuildOf = ({ documents, blocks }: IndexBacklog): number => documents + blocks;

/** How often the tracker reads a count while work goes on. */
export const BACKLOG_RECOUNT_INTERVAL = 1_000;

/**
 * The host's {@link DataService.IndexStatus} and {@link DataService.IndexActivity}, each with an event
 * on change. The one place index counts become progress: it decides when each count is taken (at most
 * once per {@link BACKLOG_RECOUNT_INTERVAL}), a count that fails leaves progress as it was, and each
 * kind of work ends when it does.
 */
export class IndexStatusTracker {
  /** Each change of the status, so each is progress of a migration or rebuild. */
  readonly updated = new Event<DataService.IndexStatus>();

  readonly activityUpdated = new Event<DataService.IndexActivity>();

  #status = IDLE;

  #activity: DataService.IndexActivity = {};

  /** Documents whose heads moved on, from the last pass that counted them. */
  #documentCatchUp = 0;

  /** Feed blocks stored after the host opened, from the last backlog count. */
  #feedCatchUp = 0;

  readonly #recountInterval: number;

  #countBacklog: () => Promise<IndexBacklog> = () => Promise.reject(new Error('index status not opened'));

  /** Whether the running pass counts; see {@link beginPass}. */
  #counting = false;

  #countedAt = Number.NEGATIVE_INFINITY;

  #fullTextCountedAt = Number.NEGATIVE_INFINITY;

  /** `recountInterval` overrides {@link BACKLOG_RECOUNT_INTERVAL}; tests count every pass. */
  constructor({ recountInterval = BACKLOG_RECOUNT_INTERVAL }: { recountInterval?: number } = {}) {
    this.#recountInterval = recountInterval;
  }

  get current(): DataService.IndexStatus {
    return this.#status;
  }

  get activity(): DataService.IndexActivity {
    return this.#activity;
  }

  setMigrating(done: number, total: number): void {
    this.#setStatus({ phase: 'migrating', done, total });
  }

  /** Counts the rebuild once the stores open, which ends any migration; `count` is the backlog count from then on. */
  async opened(count: () => Promise<IndexBacklog>): Promise<void> {
    this.#countBacklog = count;
    this.#countedAt = performance.now();
    const backlog = await this.#count(count);
    this.#setStatus(withRebuild(this.#status, backlog ? rebuildOf(backlog) : 0));
  }

  /** Whether the pass about to run counts its documents' catch-up, and the backlog after it. */
  beginPass(): boolean {
    this.#counting = performance.now() - this.#countedAt >= this.#recountInterval;
    if (this.#counting) {
      this.#countedAt = performance.now();
    }
    return this.#counting;
  }

  /**
   * Moves the status and catch-up on after a pass, and after a counting one (see {@link beginPass})
   * takes its documents' `catchUp` and recounts the backlog. A drained pass read every document it had
   * to, so it ends the rebuild and catch-up.
   */
  async afterPass({ drained, catchUp }: { drained: boolean; catchUp?: number }): Promise<void> {
    const counting = this.#counting;
    this.#counting = false;
    if (drained) {
      this.#documentCatchUp = 0;
      this.#feedCatchUp = 0;
      this.#setStatus(IDLE);
      this.#setActivity(withLane(this.#activity, 'catchUp', 0));
      return;
    }
    if (counting) {
      this.#documentCatchUp = catchUp ?? 0;
      const backlog = await this.#count(this.#countBacklog);
      if (backlog) {
        this.#feedCatchUp = backlog.catchUp;
        this.#setStatus(withRebuild(this.#status, rebuildOf(backlog)));
      }
    }
    this.#setActivity(withLane(this.#activity, 'catchUp', this.#documentCatchUp + this.#feedCatchUp));
  }

  /** After a full-text batch that leaves more, recounts what is left with `count` when due. */
  async afterFullTextBatch(count: () => Promise<number>): Promise<void> {
    if (performance.now() - this.#fullTextCountedAt < this.#recountInterval) {
      return;
    }
    this.#fullTextCountedAt = performance.now();
    const remaining = await this.#count(count);
    if (remaining !== undefined) {
      this.#setActivity(withLane(this.#activity, 'fullText', remaining));
    }
  }

  /** A full-text flush ended, done or failed, and its lane with it. */
  fullTextEnded(): void {
    this.#setActivity(withLane(this.#activity, 'fullText', 0));
  }

  /** Runs a count for progress; one that fails is logged rather than failing the work it reports on. */
  async #count<T>(count: () => Promise<T>): Promise<T | undefined> {
    try {
      return await count();
    } catch (err) {
      log.warn('index progress count failed', { err });
      return undefined;
    }
  }

  #setStatus(status: DataService.IndexStatus): void {
    const current = this.#status;
    if (status.phase === current.phase && status.done === current.done && status.total === current.total) {
      return;
    }
    this.#status = status;
    this.updated.emit(status);
  }

  #setActivity(activity: DataService.IndexActivity): void {
    const current = this.#activity;
    if (sameProgress(activity.catchUp, current.catchUp) && sameProgress(activity.fullText, current.fullText)) {
      return;
    }
    this.#activity = activity;
    this.activityUpdated.emit(activity);
  }
}

const SOURCE_AUTOMERGE = 'automerge';
const SOURCE_FEED = 'queue';
const FEED_NAMESPACES = [FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace];

/** What {@link countIndexBacklog} found the primary indexes have not reached. */
export type IndexBacklog = {
  /** Documents with no cursor: the rebuild, with {@link blocks}. */
  documents: number;
  /** Feed blocks stored before the host opened: the rebuild, with {@link documents}. */
  blocks: number;
  /** Feed blocks stored after the host opened, as after time offline. */
  catchUp: number;
};

/**
 * The newest feed block when the host opens. Feed blocks share one insertion counter, so the blocks the
 * index has not read up to it stay a rebuild until it reads them, and blocks stored later are catch-up;
 * a feed cursor covers a whole namespace, so whether one exists cannot tell the two apart.
 */
export const readFeedPin = (): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const [row] = yield* sql<{ pin: number | null }>`SELECT MAX(insertionId) AS pin FROM blocks`;
    return row?.pin ?? -1;
  });

/**
 * What the primary indexes have not reached, under whichever primary index is furthest behind:
 * documents with no cursor, and the blocks of the feeds of `spaceIds` (the spaces the host has loaded,
 * which the indexer reads), split at `pin` (see {@link readFeedPin}).
 *
 * A document with a cursor but newer heads is not counted (heads are stored as a blob that SQL cannot
 * compare with a cursor); the indexing pass counts that catch-up as it reads.
 */
export const countIndexBacklog = ({
  pin,
  spaceIds,
}: {
  pin: number;
  spaceIds: readonly string[];
}): Effect.Effect<IndexBacklog, SqlError.SqlError, SqlClient.SqlClient> =>
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

    let blocks = 0;
    let catchUp = 0;
    if (spaceIds.length === 0) {
      return { documents, blocks, catchUp };
    }
    // A feed cursor is `<token>|<insertionId>` and covers every feed of one namespace in a space; the
    // furthest-behind primary index sets where reading resumes, and one with no cursor starts over.
    const feeds = yield* sql<{ spaceId: string; feedNamespace: string }>`
      SELECT DISTINCT spaceId, feedNamespace FROM feeds
      WHERE feedNamespace IN ${sql.in(FEED_NAMESPACES)} AND spaceId IN ${sql.in([...spaceIds])}`;
    for (const { spaceId, feedNamespace } of feeds) {
      const cursors = yield* sql<{ cursor: string | null }>`
        SELECT cursor FROM indexCursor
        WHERE sourceName = ${SOURCE_FEED} AND spaceId = ${spaceId} AND resourceId = ${feedNamespace}
          AND indexName IN ${sql.in([...IndexEngine.primaryIndexNames])}`;
      const positions = cursors.map(({ cursor }) => Number(cursor?.split('|')[1] ?? Number.NaN));
      const after =
        positions.length === IndexEngine.primaryIndexNames.length && positions.every(Number.isFinite)
          ? Math.min(...positions)
          : -1;
      const [row] = yield* sql<{ rebuild: number | null; catchUp: number | null }>`
        SELECT SUM(b.insertionId <= ${pin}) AS rebuild, SUM(b.insertionId > ${pin}) AS catchUp
        FROM blocks b JOIN feeds f ON f.feedPrivateId = b.feedPrivateId
        WHERE f.spaceId = ${spaceId} AND f.feedNamespace = ${feedNamespace} AND b.insertionId > ${after}`;
      blocks += row?.rebuild ?? 0;
      catchUp += row?.catchUp ?? 0;
    }

    return { documents, blocks, catchUp };
  });
