//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Entity } from '@dxos/echo';
import { EchoURI } from '@dxos/keys';

import { createFeedServiceLayer } from './queue/feed-service';
import { type QueueAPI, type QueueFactory } from './queue/queue-factory';
import type { Queue } from './queue/types';

/**
 * Gives access to all queues.
 * @deprecated Use Feed.FeedService instead.
 */
export class QueueService extends Context.Tag('@dxos/functions/QueueService')<
  QueueService,
  {
    /**
     * API to access the queues.
     */
    readonly queues: QueueAPI;
  }
>() {
  static notAvailable = Layer.succeed(QueueService, {
    queues: {
      get(_dxn) {
        throw new Error('Queues not available');
      },
      create() {
        throw new Error('Queues not available');
      },
    },
  });

  static make = (queues: QueueFactory): Context.Tag.Service<QueueService> => {
    return {
      queues,
    };
  };

  static layer = (queues: QueueFactory): Layer.Layer<QueueService> =>
    Layer.succeed(QueueService, QueueService.make(queues));

  /**
   * Gets a queue by its DXN.
   */
  static getQueue = <T extends Entity.Unknown = Entity.Unknown>(
    dxn: EchoURI.EchoURI,
  ): Effect.Effect<Queue<T>, never, QueueService> => QueueService.pipe(Effect.map(({ queues }) => queues.get<T>(dxn)));

  /**
   * Creates a new queue.
   */
  static createQueue = <T extends Entity.Unknown = Entity.Unknown>(options?: {
    subspaceTag?: string;
  }): Effect.Effect<Queue<T>, never, QueueService> =>
    QueueService.pipe(Effect.map(({ queues }) => queues.create<T>(options)));

  static append = <T extends Entity.Unknown = Entity.Unknown>(queue: Queue<T>, objects: T[]): Effect.Effect<void> =>
    Effect.promise(() => queue.append(objects));
}

export const feedServiceFromQueueServiceLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { queues } = yield* QueueService;
    return createFeedServiceLayer(queues);
  }),
);
