import { Context } from 'effect';
import type { QueuesAPI } from '../handler';

export class QueuesService extends Context.Tag('QueuesService')<
  QueuesService,
  {
    readonly queues: QueuesAPI;
  }
>() {}
