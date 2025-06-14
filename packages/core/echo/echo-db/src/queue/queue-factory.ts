//
// Copyright 2025 DXOS.org
//

import { Resource } from '@dxos/context';
import type { BaseEchoObject } from '@dxos/echo-schema';
import { assertState } from '@dxos/invariant';
import type { DXN } from '@dxos/keys';

import { QueueImpl } from './queue';
import type { QueuesService } from './queue-service';
import type { Queue } from './types';

export interface AbstractQueueFactory {
  get<T extends BaseEchoObject = BaseEchoObject>(dxn: DXN): Queue<T>;
}

export class QueueFactory extends Resource implements AbstractQueueFactory {
  private readonly _queues = new Map<DXN.String, Queue<BaseEchoObject>>();
  private _service?: QueuesService = undefined;

  setService(service: QueuesService): void {
    this._service = service;
  }

  get<T extends BaseEchoObject = BaseEchoObject>(dxn: DXN): Queue<T> {
    assertState(this._service, 'Service not set');

    const stringDxn = dxn.toString();
    const queue = this._queues.get(stringDxn);
    if (queue) {
      return queue as Queue<T>;
    }

    const newQueue = new QueueImpl<T>(this._service, dxn);
    this._queues.set(stringDxn, newQueue);
    return newQueue as Queue<T>;
  }
}
