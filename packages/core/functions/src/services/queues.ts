//
// Copyright 2025 DXOS.org
//

import { Context } from 'effect';

import type { Queue, QueueFactory } from '@dxos/echo-db';

export class QueueService extends Context.Tag('QueueService')<
  QueueService,
  {
    readonly contextQueue: Queue | undefined;
    readonly queues: QueueFactory;
  }
>() {}
