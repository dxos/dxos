//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/sql/SqlClient';

import * as FactFeed from '@dxos/echo-memory/FactFeed';
import type * as RdfStore from '@dxos/echo-memory/RdfStore';
import { type FeedStore } from '@dxos/feed';
import { type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import type { QuadStore } from '@dxos/sparql-sqlite/async';

/** Most blocks one read pulls from the feed per query. */
const PAGE_SIZE = 500;

export type FactFeedOptions = {
  readonly feeds: FeedStore;
  readonly spaceId: SpaceId;
  /** The space's fact feed. */
  readonly feedId: string;
};

/**
 * A quad log over a feed in the `facts` namespace of the space's feed store, which replicates it like any other feed:
 * the store appends each batch there before applying it, and rebuilds from it when empty. The cursor is the feed's own
 * query cursor.
 */
export const factFeedLog: (options: FactFeedOptions) => Effect.Effect<QuadStore.QuadLog, never, SqlClient.SqlClient> =
  Effect.fnUntraced(function* ({ feeds, spaceId, feedId }: FactFeedOptions) {
    const services = yield* Effect.context<SqlClient.SqlClient>();
    return {
      append: (batch) =>
        feeds
          .appendLocal([{ spaceId, feedId, feedNamespace: FactFeed.NAMESPACE, data: FactFeed.encodeBlock(batch) }])
          .pipe(Effect.asVoid, Effect.provide(services)),

      read: (cursor) =>
        Effect.gen(function* () {
          const batches: RdfStore.Batch[] = [];
          let next = cursor === undefined ? undefined : FeedProtocol.FeedCursor.make(cursor);
          while (true) {
            const page = yield* feeds.query({
              spaceId,
              feedNamespace: FactFeed.NAMESPACE,
              query: { feedIds: [feedId] },
              cursor: next,
              limit: PAGE_SIZE,
            });
            batches.push(...page.blocks.map(({ data }) => FactFeed.decodeBlock(data)));
            next = page.nextCursor;
            if (!page.hasMore) {
              return { batches, next };
            }
          }
        }).pipe(Effect.provide(services)),

      listen: (onChange) =>
        Effect.acquireRelease(
          Effect.sync(() =>
            feeds.onNewBlocks.on((event) => {
              if (event.spaceId === spaceId && (event.feedNamespace ?? FactFeed.NAMESPACE) === FactFeed.NAMESPACE) {
                onChange();
              }
            }),
          ),
          (unsubscribe) => Effect.sync(() => unsubscribe()),
        ),
    } satisfies QuadStore.QuadLog;
  });
