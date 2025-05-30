import type { Queue, QueueFactory } from '@dxos/echo-db';
import { Context } from 'effect';

export class QueuesService extends Context.Tag('QueuesService')<
  QueuesService,
  {
    readonly contextQueue: Queue | undefined;

    readonly queues: QueueFactory;
  }
>() {}
