//
// Copyright 2025 DXOS.org
//

import { type Context, Resource } from '@dxos/context';
import { type Entity, type Hypergraph } from '@dxos/echo';
import { assertArgument, assertState } from '@dxos/invariant';
import { EchoId, ObjectId, type SpaceId } from '@dxos/keys';
import { type FeedProtocol } from '@dxos/protocols';

import { QueueImpl } from './queue';
import { type Queue } from './types';

export interface QueueAPI {
  get<T extends Entity.Unknown = Entity.Unknown>(echoId: EchoId.EchoId): Queue<T>;
  create<T extends Entity.Unknown = Entity.Unknown>(options?: { subspaceTag?: string }): Queue<T>;
}

export class QueueFactory extends Resource implements QueueAPI {
  private readonly _queues = new Map<string, QueueImpl>();

  private _service?: FeedProtocol.QueueService = undefined;

  constructor(
    private readonly _spaceId: SpaceId,
    private readonly _graph: Hypergraph.Hypergraph,
  ) {
    super();
  }

  protected override async _close(_ctx: Context): Promise<void> {
    await Promise.allSettled(this._queues.values().map((queue) => queue.dispose()));
  }

  setService(service: FeedProtocol.QueueService): void {
    this._service = service;
  }

  get<T extends Entity.Unknown>(echoId: EchoId.EchoId): Queue<T> {
    assertState(this._service, 'Service not set');
    assertArgument(EchoId.isEchoId(echoId), 'echoId', 'must be an EchoId');

    const queue = this._queues.get(echoId);
    if (queue) {
      return queue as any as Queue<T>;
    }

    const database = this._graph.getDatabase(this._spaceId);
    const newQueue = new QueueImpl<T>(
      this._service,
      this._graph.createRefResolver({ context: { space: this._spaceId, feed: echoId } }),
      echoId,
      database,
    );
    this._queues.set(echoId, newQueue);
    return newQueue as any as Queue<T>;
  }

  create<T extends Entity.Unknown>({ subspaceTag = 'data' }: { subspaceTag?: string } = {}): Queue<T> {
    const queueId = ObjectId.random();
    const echoId = EchoId.fromSpaceAndObjectId(this._spaceId, queueId);
    const database = this._graph.getDatabase(this._spaceId);
    assertState(this._service, 'Service not set');
    const newQueue = new QueueImpl<T>(
      this._service,
      this._graph.createRefResolver({ context: { space: this._spaceId, feed: echoId } }),
      echoId,
      database,
      subspaceTag,
    );
    this._queues.set(echoId, newQueue);
    return newQueue as any as Queue<T>;
  }
}
