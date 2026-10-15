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

/** The host's current {@link DataService.IndexStatus}, with an event on each change. */
export class IndexStatusTracker {
  readonly updated = new Event<DataService.IndexStatus>();

  #status = IDLE;

  get current(): DataService.IndexStatus {
    return this.#status;
  }

  setMigrating(done: number, total: number): void {
    this.#set({ ...this.#status, phase: 'migrating', done, total });
  }

  /** Records `remaining` items left to rebuild; see {@link countIndexBacklog}. */
  setBacklog(remaining: number): void {
    const { phase, done, total, ...lanes } = this.#status;
    const rebuild = advance(phase === 'indexing' ? { done, total } : undefined, remaining);
    this.#set(rebuild ? { ...lanes, phase: 'indexing', ...rebuild } : { ...lanes, ...IDLE });
  }

  /** Records `remaining` items past a cursor the index already holds: documents whose heads moved on, and feed blocks. */
  setCatchUp(remaining: number): void {
    this.#setLane('catchUp', remaining);
  }

  /** Records `remaining` objects the full-text index has not reached. */
  setFullText(remaining: number): void {
    this.#setLane('fullText', remaining);
  }

  #setLane(lane: 'catchUp' | 'fullText', remaining: number): void {
    const { [lane]: progress, ...rest } = this.#status;
    const next = advance(progress, remaining);
    this.#set(next ? { ...rest, [lane]: next } : rest);
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
