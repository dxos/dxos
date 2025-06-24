//
// Copyright 2025 DXOS.org
//

import { Context, Layer } from 'effect';

import type { Queue, QueueFactory } from '@dxos/echo-db';

export class QueueService extends Context.Tag('QueueService')<
  QueueService,
  {
    /**
     * API to access the queues.
     */
    readonly queues: QueueFactory;

    /**
     * The queue that is used to store the context of the current research.
     */
    // TODO(dmaretskyi): Is this really part of the queue service?
    readonly contextQueue: Queue | undefined;
  }
>() {
  static notAvailable = Layer.succeed(QueueService, {
    get queues(): QueueFactory {
      throw new Error('Queues not available');
    },
    contextQueue: undefined,
  });
}
