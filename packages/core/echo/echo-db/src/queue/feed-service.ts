//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';

import { type Entity, Feed, Obj } from '@dxos/echo';
import { type DXN } from '@dxos/keys';

import type { QueueFactory } from './queue-factory';

/**
 * Creates a Feed.Service Effect layer backed by a QueueFactory.
 * This bridges the Feed public API (in echo) to the queue implementation (in echo-db).
 */
// TODO(wittjosiah): QueueFactory should become a Feed API and be factored out to be part of the Database API in the echo package.
export const createFeedServiceLayer = (queues: QueueFactory) =>
  Layer.succeed(Feed.Service, {
    ensureBacking: (feed: Feed.Feed): DXN => {
      const queue = queues.create();
      Obj.change(feed, (mutable) => {
        Obj.getMeta(mutable).keys.push({ source: Feed.DXN_KEY, id: queue.dxn.toString() });
      });
      return queue.dxn;
    },

    append: async (feedDxn: DXN, items: Entity.Unknown[]): Promise<void> => {
      const queue = queues.get(feedDxn);
      await queue.append(items);
    },

    remove: async (feedDxn: DXN, ids: string[]): Promise<void> => {
      const queue = queues.get(feedDxn);
      await queue.delete(ids);
    },

    loadItems: async (feedDxn: DXN): Promise<Obj.Snapshot[]> => {
      const queue = queues.get<Obj.Unknown>(feedDxn);
      return queue.objects.map((item) => Obj.getSnapshot(item));
    },
  });
