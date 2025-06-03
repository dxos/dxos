//
// Copyright 2025 DXOS.org
//

import { Context } from 'effect';

import type { Queue, QueueFactory } from '@dxos/echo-db';

export class QueuesService extends Context.Tag('QueuesService')<
  QueuesService,
  {
    readonly contextQueue: Queue | undefined;

    readonly queues: QueueFactory;
  }
>() {}
