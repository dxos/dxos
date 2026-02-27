//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';

import { type Entity, Feed, type Filter, Obj, type Query } from '@dxos/echo';
import { type DXN } from '@dxos/keys';

import type { QueueFactory } from './queue-factory';

/**
 * Resolves or creates the backing DXN for a feed.
 */
const resolveDxn = (feed: Feed.Feed, queues: QueueFactory): DXN => {
  const existing = Feed.getQueueDxn(feed);
  if (existing) {
    return existing;
  }
  const queue = queues.create();
  Obj.change(feed, (mutable) => {
    Obj.getMeta(mutable).keys.push({ source: Feed.DXN_KEY, id: queue.dxn.toString() });
  });
  return queue.dxn;
};

/**
 * Creates a Feed.Service Effect layer backed by a QueueFactory.
 * This bridges the Feed public API (in echo) to the queue implementation (in echo-db).
 */
// TODO(wittjosiah): QueueFactory should become a Feed API and be factored out to be part of the Database API in the echo package.
export const createFeedServiceLayer = (queues: QueueFactory) =>
  Layer.succeed(Feed.Service, {
    append: async (feed: Feed.Feed, items: Entity.Unknown[]): Promise<void> => {
      const feedDxn = resolveDxn(feed, queues);
      const queue = queues.get(feedDxn);
      await queue.append(items);
    },

    remove: async (feed: Feed.Feed, ids: string[]): Promise<void> => {
      const feedDxn = resolveDxn(feed, queues);
      const queue = queues.get(feedDxn);
      await queue.delete(ids);
    },

    query: (feed: Feed.Feed, queryOrFilter: Query.Any | Filter.Any) => {
      const feedDxn = resolveDxn(feed, queues);
      const queue = queues.get(feedDxn);
      return queue.query(queryOrFilter as any);
    },
  });
