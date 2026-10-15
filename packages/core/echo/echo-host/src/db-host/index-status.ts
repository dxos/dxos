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

/** The host's current {@link DataService.IndexStatus}, with an event on each change. */
export class IndexStatusTracker {
  readonly updated = new Event<DataService.IndexStatus>();

  #status = IDLE;

  get current(): DataService.IndexStatus {
    return this.#status;
  }

  set(status: DataService.IndexStatus): void {
    const { phase, done, total } = this.#status;
    if (status.phase === phase && status.done === done && status.total === total) {
      return;
    }
    this.#status = status;
    this.updated.emit(status);
  }

  /** Records `remaining` items left to index, growing `total` to cover any that arrived since it was set. */
  setBacklog(remaining: number): void {
    if (remaining <= 0) {
      this.set(IDLE);
      return;
    }
    const indexed = this.#status.phase === 'indexing' ? this.#status.done : 0;
    const total = Math.max(this.#status.phase === 'indexing' ? this.#status.total : 0, indexed + remaining);
    this.set({ phase: 'indexing', done: total - remaining, total });
  }
}

const SOURCE_AUTOMERGE = 'automerge';
const SOURCE_FEED = 'queue';
const FEED_NAMESPACES = [FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace];

/**
 * How much stored data the primary indexes have not reached: documents with no cursor, plus feed
 * blocks past their feed's cursor, under whichever primary index is furthest behind.
 *
 * A document with a cursor but newer heads is not counted (heads are stored as a blob that SQL
 * cannot compare with a cursor), so this measures a rebuild, such as the one a cursor-resetting
 * migration starts, rather than ordinary catch-up.
 */
export const countIndexBacklog = (): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> =>
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
    let blocks = 0;
    const feeds = yield* sql<{ spaceId: string; feedNamespace: string }>`
      SELECT DISTINCT spaceId, feedNamespace FROM feeds WHERE ${sql.in('feedNamespace', FEED_NAMESPACES)}`;
    for (const { spaceId, feedNamespace } of feeds) {
      let behind = 0;
      for (const indexName of IndexEngine.primaryIndexNames) {
        const [cursor] = yield* sql<{ cursor: string | null }>`
          SELECT cursor FROM indexCursor
          WHERE indexName = ${indexName} AND sourceName = ${SOURCE_FEED} AND spaceId = ${spaceId} AND resourceId = ${feedNamespace}`;
        const after = Number(cursor?.cursor?.split('|')[1] ?? -1);
        const [row] = yield* sql<{ count: number }>`
          SELECT COUNT(*) AS count FROM blocks b JOIN feeds f ON f.feedPrivateId = b.feedPrivateId
          WHERE f.spaceId = ${spaceId} AND f.feedNamespace = ${feedNamespace} AND b.insertionId > ${Number.isFinite(after) ? after : -1}`;
        behind = Math.max(behind, row?.count ?? 0);
      }
      blocks += behind;
    }

    return documents + blocks;
  });
