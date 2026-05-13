//
// Copyright 2025 DXOS.org
//

import { type Context, Resource } from '@dxos/context';
import { type Entity, type Hypergraph } from '@dxos/echo';
import { assertArgument, assertState } from '@dxos/invariant';
import { EchoId, LegacyDXN as DXN, ObjectId, type QueueSubspaceTag, QueueSubspaceTags, type SpaceId } from '@dxos/keys';
import { type FeedProtocol } from '@dxos/protocols';

import { QueueImpl } from './queue';
import { type Queue } from './types';

export interface QueueAPI {
  get<T extends Entity.Unknown = Entity.Unknown>(dxn: EchoId.EchoId | DXN): Queue<T>;
  create<T extends Entity.Unknown = Entity.Unknown>(options?: { subspaceTag?: QueueSubspaceTag }): Queue<T>;
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

  get<T extends Entity.Unknown>(dxnOrEchoId: EchoId.EchoId | DXN): Queue<T> {
    assertState(this._service, 'Service not set');

    // Normalize to EchoId.
    let echoId: EchoId.EchoId;
    let legacyDxn: DXN;
    if (dxnOrEchoId instanceof DXN) {
      const queueDxn = dxnOrEchoId.asQueueDXN();
      assertArgument(queueDxn != null, 'dxnOrEchoId', 'LegacyDXN must be a QUEUE-kind DXN');
      echoId = EchoId.fromSpaceAndObjectId(queueDxn.spaceId as any, queueDxn.queueId as any);
      legacyDxn = dxnOrEchoId;
    } else {
      assertArgument(EchoId.isEchoId(dxnOrEchoId), 'dxnOrEchoId', 'must be an EchoId or LegacyDXN');
      echoId = dxnOrEchoId;
      const spaceId = EchoId.getSpaceId(echoId) ?? this._spaceId;
      const queueId = EchoId.getObjectId(echoId) ?? ObjectId.random();
      legacyDxn = new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, queueId]);
    }

    const queue = this._queues.get(echoId);
    if (queue) {
      return queue as any as Queue<T>;
    }

    const database = this._graph.getDatabase(this._spaceId);
    const newQueue = new QueueImpl<T>(
      this._service,
      this._graph.createRefResolver({ context: { space: this._spaceId, feed: legacyDxn } }),
      legacyDxn,
      database,
    );
    this._queues.set(echoId, newQueue);
    return newQueue as any as Queue<T>;
  }

  create<T extends Entity.Unknown>({
    subspaceTag = QueueSubspaceTags.DATA,
  }: { subspaceTag?: QueueSubspaceTag } = {}): Queue<T> {
    const queueId = ObjectId.random();
    const echoId = EchoId.fromSpaceAndObjectId(this._spaceId, queueId);
    // Create the LegacyDXN internally so QueueImpl gets the subspaceTag
    const legacyDxn = DXN.fromQueue(subspaceTag, this._spaceId, queueId);
    const database = this._graph.getDatabase(this._spaceId);
    assertState(this._service, 'Service not set');
    const newQueue = new QueueImpl<T>(
      this._service,
      this._graph.createRefResolver({ context: { space: this._spaceId, queue: echoId } }),
      legacyDxn,
      database,
    );
    this._queues.set(echoId, newQueue);
    return newQueue as any as Queue<T>;
  }
}
