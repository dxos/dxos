import type { DXN } from '@dxos/keys';
import type { Queue } from './types';
import type { BaseEchoObject } from '@dxos/echo-schema';
import { Resource } from '@dxos/context';
import type { QueuesService } from './queue-service';
import { QueueImpl } from './queue';
import { assertState } from '@dxos/invariant';

export interface QueuesAPI {
  get<T extends BaseEchoObject = BaseEchoObject>(dxn: DXN): Queue<T>;
}

export class QueuesAPIImpl extends Resource implements QueuesAPI {
  private _service?: QueuesService = undefined;
  private readonly _queues = new Map<DXN.String, Queue<BaseEchoObject>>();

  setService(service: QueuesService) {
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
