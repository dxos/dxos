//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer } from 'effect';

import type { Obj, Relation } from '@dxos/echo';
import type { Queue, QueueAPI, QueueFactory } from '@dxos/echo-db';
import type { DXN, QueueSubspaceTag } from '@dxos/keys';

/**
 * Gives access to all queues.
 */
export class QueueService extends Context.Tag('@dxos/functions/QueueService')<
  QueueService,
  {
    /**
     * API to access the queues.
     */
    readonly queues: QueueAPI;

    /**
     * The queue that is used to store the context of the current research.
     * @deprecated Use `ContextQueueService` instead.
     */
    readonly queue: Queue | undefined;
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
    queue: undefined,
  });

  static make = (queues: QueueFactory, queue?: Queue): Context.Tag.Service<QueueService> => {
    return {
      queues,
      queue,
    };
  };

  static layer = (queues: QueueFactory, queue?: Queue): Layer.Layer<QueueService> =>
    Layer.succeed(QueueService, QueueService.make(queues, queue));

  /**
   * Gets a queue by its DXN.
   */
  static getQueue = <T extends Obj.Any | Relation.Any = Obj.Any | Relation.Any>(
    dxn: DXN,
  ): Effect.Effect<Queue<T>, never, QueueService> => QueueService.pipe(Effect.map(({ queues }) => queues.get<T>(dxn)));

  /**
   * Creates a new queue.
   */
  static createQueue = <T extends Obj.Any | Relation.Any = Obj.Any | Relation.Any>(options?: {
    subspaceTag?: QueueSubspaceTag;
  }): Effect.Effect<Queue<T>, never, QueueService> =>
    QueueService.pipe(Effect.map(({ queues }) => queues.create<T>(options)));

  static append = <T extends Obj.Any | Relation.Any = Obj.Any | Relation.Any>(
    queue: Queue<T>,
    objects: T[],
  ): Effect.Effect<void> => Effect.promise(() => queue.append(objects));
}

/**
 * Gives access to a specific queue passed as a context.
 */
export class ContextQueueService extends Context.Tag('@dxos/functions/ContextQueueService')<
  ContextQueueService,
  {
    readonly queue: Queue;
  }
>() {
  static layer = (queue: Queue) => Layer.succeed(ContextQueueService, { queue });
}
