//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';

import { type Entity, Feed, type Filter, Obj, type Query } from '@dxos/echo';

import type { QueueImpl } from './queue';
import type { QueueAPI } from './queue-factory';

/**
 * Creates a Feed.FeedService Effect layer backed by a QueueFactory.
 * This bridges the Feed public API (in echo) to the queue implementation (in echo-db).
 */
// TODO(wittjosiah): QueueFactory should become a Feed API and be factored out to be part of the Database API in the echo package.
export const createFeedServiceLayer = (queues: QueueAPI) =>
  Layer.succeed(Feed.FeedService, {
    append: async (feed: Feed.Feed, items: Entity.Unknown[]): Promise<void> => {
      const feedDXN = Feed.getDXN(feed);
      if (!feedDXN) {
        throw new Error('Unable to append to feed: make sure feed is stored in the database');
      }
      const queue = queues.get(feedDXN) as QueueImpl;
      queue.setParentEntity(feed as Obj.Unknown);
      await queue.append(items);
    },

    remove: async (feed: Feed.Feed, ids: string[]): Promise<void> => {
      const feedDXN = Feed.getDXN(feed);
      if (!feedDXN) {
        throw new Error('Unable to remove from feed: make sure feed is stored in the database');
      }
      const queue = queues.get(feedDXN);
      await queue.delete(ids);
    },

    query: (feed: Feed.Feed, queryOrFilter: Query.Any | Filter.Any) => {
      const feedDXN = Feed.getDXN(feed);
      if (!feedDXN) {
        throw new Error('Unable to query feed: make sure feed is stored in the database');
      }
      const queue = queues.get(feedDXN) as QueueImpl;
      queue.setParentEntity(feed as Obj.Unknown);
      return queue.query(queryOrFilter as any);
    },

    sync: async (feed: Feed.Feed, options?: Feed.SyncOptions): Promise<void> => {
      const feedDXN = Feed.getDXN(feed);
      if (!feedDXN) {
        throw new Error('Unable to sync feed: make sure feed is stored in the database');
      }
      const queue = queues.get(feedDXN);
      await queue.sync(options);
    },
  });
