//
// Copyright 2025 DXOS.org
//

import { Context, Layer } from 'effect';

import type { Queue, QueueAPI, QueueFactory } from '@dxos/echo-db';

/**
 * Gives access to all queues.
 */
export class QueueService extends Context.Tag('QueueService')<
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
    readonly contextQueue: Queue | undefined;
  }
>() {
  static notAvailable = Layer.succeed(QueueService, {
    queues: {
      get(dxn) {
        throw new Error('Queues not available');
      },
      create() {
        throw new Error('Queues not available');
      },
    },
    contextQueue: undefined,
  });

  static make = (queues: QueueFactory, contextQueue?: Queue): Context.Tag.Service<QueueService> => {
    return {
      queues,
      contextQueue,
    };
  };

  static makeLayer = (queues: QueueFactory, contextQueue?: Queue): Layer.Layer<QueueService> =>
    Layer.succeed(QueueService, QueueService.make(queues, contextQueue));
}

/**
 * Gives access to a specific queue passed as a context.
 */
export class ContextQueueService extends Context.Tag('ContextQueueService')<
  ContextQueueService,
  {
    readonly contextQueue: Queue;
  }
>() {}
