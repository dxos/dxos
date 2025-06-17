//
// Copyright 2025 DXOS.org
//

import { Resource } from '@dxos/context';
import type { BaseEchoObject } from '@dxos/echo-schema';
import { assertState } from '@dxos/invariant';
import { DXN, ObjectId, QueueSubspaceTags, type QueueSubspaceTag, type SpaceId } from '@dxos/keys';

import { QueueImpl } from './queue';
import type { QueuesService } from './queue-service';
import type { Queue } from './types';
import type { Ref } from '@dxos/echo';

export interface QueueAPI {
  get<T extends BaseEchoObject = BaseEchoObject>(dxn: DXN): Queue<T>;
  create<T extends BaseEchoObject = BaseEchoObject>(options?: { subspaceTag?: QueueSubspaceTag }): Queue<T>;
}

export class QueueFactory extends Resource implements QueueAPI {
  private readonly _queues = new Map<DXN.String, Queue<BaseEchoObject>>();
  private _service?: QueuesService = undefined;

  constructor(
    private readonly _spaceId: SpaceId,
    private readonly _refResolver: Ref.Resolver,
  ) {
    super();
  }

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

    const newQueue = new QueueImpl<T>(this._service, this._refResolver, dxn);
    this._queues.set(stringDxn, newQueue);
    return newQueue as Queue<T>;
  }

  create<T extends BaseEchoObject = BaseEchoObject>({
    subspaceTag = QueueSubspaceTags.DATA,
  }: { subspaceTag?: QueueSubspaceTag } = {}): Queue<T> {
    const dxn = DXN.fromQueue(subspaceTag, this._spaceId, ObjectId.random());
    return this.get<T>(dxn);
  }
}
