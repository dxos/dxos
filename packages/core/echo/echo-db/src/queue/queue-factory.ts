//
// Copyright 2025 DXOS.org
//

import { type Context, Resource } from '@dxos/context';
import { type Entity, type Hypergraph } from '@dxos/echo';
import { assertArgument, assertState } from '@dxos/invariant';
import { EchoId, ObjectId, type SpaceId } from '@dxos/keys';
import { type FeedProtocol } from '@dxos/protocols';

import { QueueImpl } from './queue';
import { type Queue, QueueSubspaceTags } from './types';

export interface QueueAPI {
  get<T extends Entity.Unknown = Entity.Unknown>(echoId: EchoId.EchoId): Queue<T>;
  create<T extends Entity.Unknown = Entity.Unknown>(options?: { subspaceTag?: string }): Queue<T>;
}

export class QueueFactory extends Resource implements QueueAPI {
  private readonly _queues = new Map<EchoId.EchoId, QueueImpl<any>>();

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
    assertArgument(EchoId.isEchoId(echoId), 'echoId', 'must be an EchoId');
    return this._getOrCreate<T>(echoId);
  }

  /**
   * Returns an existing Queue for the given id, without creating one. Used by
   * the ref resolver to distinguish ECHO objects from queues when both share the
   * same `echo:` URI form post-Phase 6.
   */
  tryGet<T extends Entity.Unknown>(echoId: EchoId.EchoId): Queue<T> | undefined {
    return this._queues.get(echoId) as Queue<T> | undefined;
  }

  /**
   * Iterate queues already instantiated in this space (does not enumerate persisted feed catalog).
   */
  knownQueues(): Iterable<Queue<Entity.Unknown>> {
    return this._queues.values();
  }

  create<T extends Entity.Unknown>({ subspaceTag = QueueSubspaceTags.DATA }: { subspaceTag?: string } = {}): Queue<T> {
    const echoId = EchoId.fromSpaceAndObjectId(this._spaceId, ObjectId.random());
    return this._getOrCreate<T>(echoId, subspaceTag);
  }

  private _getOrCreate<T extends Entity.Unknown>(echoId: EchoId.EchoId, subspaceTag?: string): Queue<T> {
    assertState(this._service, 'Service not set');
    const existing = this._queues.get(echoId);
    if (existing) {
      return existing as Queue<T>;
    }
    const newQueue = new QueueImpl<T>(
      this._service,
      this._graph.createRefResolver({ context: { space: this._spaceId, feed: echoId } }),
      echoId,
      this._graph.getDatabase(this._spaceId),
      subspaceTag,
    );
    this._queues.set(echoId, newQueue);
    return newQueue;
  }
}
