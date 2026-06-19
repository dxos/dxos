//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

import { type Entity, Feed, Filter, Query, Scope } from '@dxos/echo';

import { type EchoDatabase } from '../proxy-db';

/**
 * Builds the {@link Feed.FeedService} runtime impl backed by a {@link EchoDatabase}.
 */
export const makeFeedService = (db: EchoDatabase): Context.Tag.Service<Feed.FeedService> => ({
  append: (feed: Feed.Feed, items: Entity.Unknown[]): Promise<void> => db.appendToFeed(feed, items),

  remove: (feed: Feed.Feed, ids: string[]): Promise<void> => db._deleteFromFeedByIds(feed, ids),

  query: (feed: Feed.Feed, queryOrFilter: Query.Any | Filter.Any) => {
    const feedUri = Feed.getQueueUri(feed);
    if (!feedUri) {
      throw new Error('Unable to query feed: make sure feed is stored in the database');
    }

    const query = Filter.is(queryOrFilter) ? Query.select(queryOrFilter) : queryOrFilter;
    return db.query(query.from(Scope.feed(feedUri)));
  },

  sync: (feed: Feed.Feed, options?: Feed.SyncOptions): Promise<void> => db._syncFeed(feed, options),

  getSyncState: (feed: Feed.Feed): Promise<Feed.SyncState> => db._getFeedSyncState(feed),
});

/**
 * Creates a Feed.FeedService Effect layer backed by a database.
 * Bridges the Feed public API (in echo) to the feed implementation (in echo-client).
 */
export const createFeedServiceLayer = (db: EchoDatabase) => Layer.succeed(Feed.FeedService, makeFeedService(db));
