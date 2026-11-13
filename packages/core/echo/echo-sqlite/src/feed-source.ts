//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { type Context } from '@dxos/context';
import { type Obj } from '@dxos/echo';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import { CypherError, type FeedStore } from '@dxos/feed';
import { type DataSourceCursor, type IndexDataSource, type IndexerObject } from '@dxos/index-core';
import { type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

/** The namespaces whose feeds hold items (queue entries), each block one item's JSON. */
export const ITEM_NAMESPACES: readonly string[] = [
  FeedProtocol.WellKnownNamespaces.data,
  FeedProtocol.WellKnownNamespaces.trace,
];

/**
 * Feeds the indexer the items appended to the space's feeds since its cursors, one cursor per item
 * namespace. A block re-appending an item's id replaces its row; a tombstone block marks it deleted.
 */
export class ItemFeedSource implements IndexDataSource {
  readonly sourceName = 'feed-items';

  readonly #feedStore: FeedStore;
  readonly #spaceId: SpaceId;
  readonly #sql: SqlClient.SqlClient;

  constructor(options: { feedStore: FeedStore; spaceId: SpaceId; sql: SqlClient.SqlClient }) {
    this.#feedStore = options.feedStore;
    this.#spaceId = options.spaceId;
    this.#sql = options.sql;
  }

  getChangedObjects(
    _ctx: Context,
    cursors: DataSourceCursor[],
    opts?: { limit?: number; objects?: boolean },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[]; more: boolean }, SqlError.SqlError> {
    if (opts?.objects === false) {
      return Effect.succeed({ objects: [], cursors: [], more: false });
    }
    return Effect.gen({ self: this }, function* () {
      const spaceId = this.#spaceId;
      const objects: IndexerObject[] = [];
      const next: DataSourceCursor[] = [];
      let remaining = opts?.limit ?? Infinity;
      let more = false;
      for (const feedNamespace of ITEM_NAMESPACES) {
        const previous = cursors.find((cursor) => cursor.spaceId === spaceId && cursor.resourceId === feedNamespace);
        if (remaining <= 0) {
          more = true;
          if (previous) {
            next.push(previous);
          }
          continue;
        }
        const stored =
          typeof previous?.cursor === 'string' && previous.cursor !== ''
            ? FeedProtocol.FeedCursor.make(previous.cursor)
            : undefined;
        // A cursor from another store cannot be read from; the index is derived, so reading again is safe.
        const current =
          stored && (yield* this.#feedStore.isCursorCurrent(spaceId, stored))
            ? stored
            : FeedProtocol.encodeFeedCursor(yield* this.#feedStore.getServerToken(spaceId), FeedProtocol.FEED_START);
        const result = yield* this.#feedStore.query({
          spaceId,
          feedNamespace,
          cursor: current,
          limit: Number.isFinite(remaining) ? remaining : undefined,
        });
        for (const block of result.blocks) {
          const data = EchoFeedCodec.decodeBlock(block);
          if (block.feedId === undefined || !isItemJson(data)) {
            continue;
          }
          objects.push({
            spaceId,
            queueId: block.feedId,
            queueNamespace: feedNamespace,
            documentId: null,
            recordId: null,
            queuePosition: block.position ?? null,
            queueInsertionId: block.insertionId ?? null,
            data,
            createdAt: null,
            updatedAt: block.timestamp,
          });
        }
        remaining -= result.blocks.length;
        more ||= result.hasMore;
        next.push({ spaceId, resourceId: feedNamespace, cursor: result.nextCursor });
      }
      return { objects, cursors: next, more };
    }).pipe(
      Effect.provideService(SqlClient.SqlClient, this.#sql),
      // Item namespaces carry no cypher here, so a cypher failure is a defect.
      Effect.catchIf(
        (error): error is CypherError => error instanceof CypherError,
        (error) => Effect.die(error),
      ),
    );
  }
}

/** A block's JSON is an item (or a tombstone) when it names the item's id. */
const isItemJson = (value: Record<string, unknown>): value is Obj.JSON => typeof value.id === 'string';
