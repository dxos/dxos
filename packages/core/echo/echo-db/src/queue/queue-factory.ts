//
// Copyright 2025 DXOS.org
//

import { Resource } from '@dxos/context';
import { type Obj, type Relation } from '@dxos/echo';
import { assertArgument, assertState } from '@dxos/invariant';
import { DXN, ObjectId, type QueueSubspaceTag, QueueSubspaceTags, type SpaceId } from '@dxos/keys';
import { type QueueService } from '@dxos/protocols';

import { type Hypergraph } from '../hypergraph';

import { QueueImpl } from './queue';
import { type Queue } from './types';

export interface QueueAPI {
  get<T extends Obj.Any | Relation.Any = Obj.Any | Relation.Any>(dxn: DXN): Queue<T>;
  create<T extends Obj.Any | Relation.Any = Obj.Any | Relation.Any>(options?: {
    subspaceTag?: QueueSubspaceTag;
  }): Queue<T>;
}

export class QueueFactory extends Resource implements QueueAPI {
  private readonly _queues = new Map<DXN.String, Queue<Obj.Any | Relation.Any>>();
  private _service?: QueueService = undefined;

  constructor(
    private readonly _spaceId: SpaceId,
    private readonly _graph: Hypergraph,
  ) {
    super();
  }

  setService(service: QueueService): void {
    this._service = service;
  }

  get<T extends Obj.Any | Relation.Any>(dxn: DXN): Queue<T> {
    assertArgument(dxn instanceof DXN, 'dxn', 'dxn must be a DXN');
    assertState(this._service, 'Service not set');

    const stringDxn = dxn.toString();
    const queue = this._queues.get(stringDxn);
    if (queue) {
      return queue as Queue<T>;
    }

    const newQueue = new QueueImpl<T>(
      this._service,
      this._graph.createRefResolver({ context: { space: this._spaceId, queue: dxn } }),
      dxn,
    );
    this._queues.set(stringDxn, newQueue);
    return newQueue as Queue<T>;
  }

  create<T extends Obj.Any | Relation.Any>({
    subspaceTag = QueueSubspaceTags.DATA,
  }: { subspaceTag?: QueueSubspaceTag } = {}): Queue<T> {
    const dxn = DXN.fromQueue(subspaceTag, this._spaceId, ObjectId.random());
    return this.get<T>(dxn);
  }
}
