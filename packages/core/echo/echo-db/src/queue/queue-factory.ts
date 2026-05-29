//
// Copyright 2025 DXOS.org
//

import { type Context, Resource } from '@dxos/context';
import { type Entity, type Hypergraph } from '@dxos/echo';
import { assertArgument, assertState } from '@dxos/invariant';
import { EID, EntityId, type SpaceId } from '@dxos/keys';
import { type FeedProtocol } from '@dxos/protocols';

import { QueueImpl } from './queue';
import { type Queue, QueueSubspaceTags } from './types';

export interface QueueAPI {
  get<T extends Entity.Unknown = Entity.Unknown>(
    echoUri: EID.EID,
    options?: { subspaceTag?: string },
  ): Queue<T>;
  create<T extends Entity.Unknown = Entity.Unknown>(options?: { subspaceTag?: string }): Queue<T>;
}

export class QueueFactory extends Resource implements QueueAPI {
  private readonly _queues = new Map<EID.EID, QueueImpl<any>>();

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

  get<T extends Entity.Unknown>(echoUri: EID.EID, { subspaceTag }: { subspaceTag?: string } = {}): Queue<T> {
    assertArgument(EID.isEID(echoUri), 'echoUri', 'must be an EID');
    return this._getOrCreate<T>(echoUri, subspaceTag);
  }

  /**
   * Returns an existing Queue for the given URI, or `undefined` if no queue has
   * been instantiated at that URI in this space.
   *
   * Unlike {@link get}, does NOT create a queue as a side effect. Use this when
   * a URI could plausibly address either a queue or an ECHO object (the two
   * share the same `echo://<spaceId>/<objectId>` shape) and you only want to
   * resolve to a queue that already exists — calling `get` in that situation
   * would manufacture a phantom queue at every URI that turns out to be an
   * object, poisoning later real lookups.
   */
  tryGet<T extends Entity.Unknown>(echoUri: EID.EID): Queue<T> | undefined {
    return this._queues.get(echoUri) as Queue<T> | undefined;
  }

  /**
   * Iterates queues already instantiated in this space.
   *
   * Returns only the in-memory cache — does NOT enumerate the persisted feed
   * catalog. Intended for callers that need to scan currently-active queues
   * synchronously (e.g. searching across them for an object id) without paying
   * the cost of an async catalog query per call.
   */
  knownQueues(): Iterable<Queue<Entity.Unknown>> {
    return this._queues.values();
  }

  create<T extends Entity.Unknown>({ subspaceTag = QueueSubspaceTags.DATA }: { subspaceTag?: string } = {}): Queue<T> {
    const echoUri = EID.make({ spaceId: this._spaceId, entityId: EntityId.random() });
    return this._getOrCreate<T>(echoUri, subspaceTag);
  }

  private _getOrCreate<T extends Entity.Unknown>(echoUri: EID.EID, subspaceTag?: string): Queue<T> {
    assertState(this._service, 'Service not set');
    const existing = this._queues.get(echoUri);
    if (existing) {
      return existing as Queue<T>;
    }
    const newQueue = new QueueImpl<T>(
      this._service,
      this._graph.createRefResolver({ context: { space: this._spaceId, feed: echoUri } }),
      echoUri,
      this._graph.getDatabase(this._spaceId),
      subspaceTag,
    );
    this._queues.set(echoUri, newQueue);
    return newQueue;
  }
}
