//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { StackTrace } from '@dxos/debug';
import { type Database, type Entity, Filter, type Hypergraph, Query, Ref } from '@dxos/echo';
import { batchEvents, type AnyProperties, setRefResolver } from '@dxos/echo/internal';
import { DXN, EchoURI, type ObjectId, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { entry } from '@dxos/util';

import { type ItemsUpdatedEvent } from './core-db';
import { type EchoDatabaseImpl, RuntimeSchemaRegistry } from './proxy-db';
import { GraphQueryContext, type QueryContext, QueryResultImpl, type QuerySource, SpaceQuerySource } from './query';
import type { Queue, QueueFactory } from './queue';

const TRACE_REF_RESOLUTION = false;

/**
 * Manages cross-space database interactions.
 */
export class HypergraphImpl implements Hypergraph.Hypergraph {
  private readonly _databases = new Map<SpaceId, EchoDatabaseImpl>();
  private readonly _queueFactories = new Map<SpaceId, QueueFactory>();

  // TODO(burdon): Space dependency?
  private readonly _owningObjects = new Map<SpaceId, unknown>();
  private readonly _schemaRegistry = new RuntimeSchemaRegistry();
  private readonly _updateEvent = new Event<ItemsUpdatedEvent>();
  private readonly _resolveEvents = new Map<SpaceId, Map<string, Event<Entity.Any>>>();
  private readonly _queryContexts = new Set<GraphQueryContext>();
  private readonly _querySourceProviders: QuerySourceProvider[] = [];

  get schemaRegistry(): RuntimeSchemaRegistry {
    return this._schemaRegistry;
  }

  /**
   * Register a database.
   * @param spaceId Space id.
   * @param spaceKey Space key.
   * @param database Database backend.
   * @param owningObject Database owner, usually a space.
   */
  _registerDatabase(
    spaceId: SpaceId,
    /** @deprecated Use spaceId */
    database: EchoDatabaseImpl,
    owningObject?: unknown,
  ): void {
    this._databases.set(spaceId, database);
    this._owningObjects.set(spaceId, owningObject);
    database.coreDatabase._updateEvent.on(this._onUpdate.bind(this));

    const map = this._resolveEvents.get(spaceId);
    if (map) {
      for (const [id, event] of map) {
        const obj = database.getObjectById(id);
        if (obj) {
          log('resolve', { spaceId, objectId: id });
          event.emit(obj);
          map.delete(id);
        }
      }
    }

    for (const context of this._queryContexts.values()) {
      context.addQuerySource(new SpaceQuerySource(database));
    }
  }

  /**
   * @internal
   */
  _unregisterDatabase(spaceId: SpaceId): void {
    // TODO(dmaretskyi): Remove db from query contexts.
    this._databases.delete(spaceId);
  }

  /**
   * @internal
   */
  _registerQueueFactory(spaceId: SpaceId, factory: QueueFactory): void {
    this._queueFactories.set(spaceId, factory);
  }

  /**
   * @internal
   */
  _unregisterQueueFactory(spaceId: SpaceId): void {
    this._queueFactories.delete(spaceId);
  }

  _getOwningObject(spaceId: SpaceId): unknown | undefined {
    return this._owningObjects.get(spaceId);
  }

  // Odd way to define methods types from a typedef.
  declare query: Database.QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(queryOrFilter: Query.Any | Filter.Any) {
    const query = Filter.is(queryOrFilter) ? Query.select(queryOrFilter) : queryOrFilter;
    return new QueryResultImpl(this._createLiveObjectQueryContext(), query);
  }

  /**
   * Creates a reference to an existing object in the database.
   *
   * NOTE: The reference may be dangling if the object is not present in the database.
   *
   * ## Difference from `Ref.fromURI`
   *
   * `Ref.fromURI(dxn)` returns an unhydrated reference. The `.load` and `.target` APIs will not work.
   * `graph.ref(dxn)` is preferable in cases with access to the database.
   *
   */
  makeRef<T extends AnyProperties = any>(uri: URI.URI): Ref.Ref<T> {
    const ref = Ref.fromURI(uri);
    setRefResolver(ref, this.createRefResolver({}));
    return ref;
  }

  getDatabase(spaceId: SpaceId): EchoDatabaseImpl | undefined {
    return this._databases.get(spaceId);
  }

  /**
   * @param hostDb Host database for reference resolution.
   * @param middleware Called with the loaded object. The caller may change the object.
   * @returns Result of `onLoad`.
   */
  createRefResolver({ context = {}, middleware = (obj) => obj }: Hypergraph.RefResolverOptions): Ref.Resolver {
    // TODO(dmaretskyi): Rewrite resolution algorithm with tracks for absolute and relative DXNs.

    return {
      // TODO(dmaretskyi): Respect `load` flag.
      resolveSync: (uri: URI.URI, load: boolean, onLoad?: () => void) => {
        if (!EchoURI.isEchoURI(uri)) {
          return undefined; // Unsupported URI kind.
        }

        const res = this._resolveSync(uri, context, onLoad);

        if (res) {
          return middleware(res);
        } else {
          return undefined;
        }
      },

      resolve: async (uri) => {
        const obj = await this._resolveAsync(uri, context);
        if (obj) {
          return middleware(obj);
        } else {
          return undefined;
        }
      },

      resolveSchema: async (uri) => {
        const beginTime = TRACE_REF_RESOLUTION ? performance.now() : 0;
        let status: string = '';
        try {
          if (DXN.isDXN(uri)) {
            const schema = this.schemaRegistry.getSchemaByDXN(uri);
            status = schema != null ? 'resolved' : 'missing';
            return schema;
          } else if (EchoURI.isEchoURI(uri)) {
            status = 'error';
            throw new Error('Not implemented: Resolving schema stored in the database');
          } else {
            status = 'unknown URI';
            return undefined;
          }
        } finally {
          if (TRACE_REF_RESOLUTION) {
            log.info('resolveSchema', {
              uri: uri.toString(),
              status,
              time: performance.now() - beginTime,
            });
          }
        }
      },
    } satisfies Ref.Resolver;
  }

  /**
   * @param db
   * @param ref
   * @param onResolve will be weakly referenced.
   */
  private _resolveSync(
    uri: URI.URI,
    context: Hypergraph.RefResolutionContext,
    onResolve?: (obj: Entity.Any) => void,
  ): Entity.Any | Queue | undefined {
    const parsedEchoUri = EchoURI.tryParse(uri);
    if (!parsedEchoUri) {
      throw new Error('Unsupported URI kind');
    }

    const spaceId = EchoURI.getSpaceId(parsedEchoUri) ?? context.space;
    const objectId = EchoURI.getObjectId(parsedEchoUri);
    if (spaceId === undefined || objectId === undefined) {
      throw new Error(`Unable to determine the Space to resolve the reference: ${uri}`);
    }

    const db = this._databases.get(spaceId);
    if (db) {
      // Resolve remote reference.
      const obj = db.getObjectById(objectId);
      if (obj) {
        return obj;
      }
    }

    // Fallback: try to resolve as a queue (Feed object backed by queue service).
    // Only resolve if a queue with this id has been explicitly created — otherwise
    // QueueFactory.get would manufacture a phantom queue for every unknown ECHO ref.
    const queueEchoUri = EchoURI.make({ spaceId: spaceId, objectId: objectId });
    const queueFactory = this._queueFactories.get(spaceId);
    const queue = queueFactory?.tryGet(queueEchoUri);
    if (queue) {
      return queue;
    }

    // TODO(dmaretskyi): Consider throwing if space not found.

    if (!OBJECT_DIAGNOSTICS.has(objectId)) {
      OBJECT_DIAGNOSTICS.set(objectId, {
        spaceId,
        objectId,
        loadReason: 'reference access',
        loadedStack: new StackTrace(),
      });
    }

    log('trap', { spaceId, objectId });
    if (onResolve) {
      entry(this._resolveEvents, spaceId)
        .orInsert(new Map())
        .deep(objectId)
        .orInsert(new Event())
        .value.on(new Context(), onResolve);
    }
  }

  private async _resolveAsync(
    uri: URI.URI,
    context: Hypergraph.RefResolutionContext,
  ): Promise<Entity.Unknown | Queue | undefined> {
    const beginTime = TRACE_REF_RESOLUTION ? performance.now() : 0;
    let status: string = '';
    try {
      const parsedEchoUri = EchoURI.tryParse(uri);
      if (parsedEchoUri) {
        const echoUri = EchoURI.getObjectId(parsedEchoUri);
        const echoSpaceId = EchoURI.getSpaceId(parsedEchoUri);
        if (!echoUri) {
          status = 'error';
          throw new Error(`Invalid EchoURI: ${uri}`);
        }
        if (!EchoURI.isLocal(parsedEchoUri) && echoSpaceId !== context.space) {
          status = 'error';
          throw new Error('Cross-space references are not yet supported');
        }

        const feedEchoId = context.feed && EchoURI.isEchoURI(context.feed) ? context.feed : undefined;
        if (feedEchoId) {
          const feedSpaceId = EchoURI.getSpaceId(feedEchoId) ?? context.space;
          const queueId = EchoURI.getObjectId(feedEchoId);
          if (feedSpaceId && queueId) {
            const queueEchoUri = EchoURI.make({ spaceId: feedSpaceId, objectId: queueId });
            const obj = await this._resolveQueueObjectAsync(queueEchoUri, echoUri);
            if (obj) {
              status = 'resolved';
              return obj;
            }
          }
        }

        if (!context.space) {
          status = 'error';
          throw new Error('Resolving context-free references is not supported');
        }

        // (1) Search space automerge docs first.
        const obj = await this._resolveDatabaseObjectAsync(context.space, echoUri);
        if (obj) {
          status = 'resolved';
          return obj;
        }

        // (2) Search known feeds in this space for an item with this id.
        const feedObj = await this._resolveObjectInKnownQueues(context.space, echoUri);
        if (feedObj) {
          status = 'resolved';
          return feedObj;
        }

        // (3) Fallback: caller may be addressing a queue itself by URI.
        const queueEchoUri = EchoURI.make({ spaceId: context.space, objectId: echoUri });
        const queue = this._resolveQueueSync(queueEchoUri);
        if (queue) {
          status = 'resolved';
          return queue;
        }

        status = 'missing';
        return undefined;
      } else {
        status = 'error';
        throw new Error(`Unsupported URI kind: ${uri}`);
      }
    } finally {
      if (TRACE_REF_RESOLUTION) {
        log.info('resolve', {
          uri,
          status,
          time: performance.now() - beginTime,
        });
      }
    }
  }

  /**
   * Search the queues already known to this space (i.e. previously created or accessed)
   * for an object with the given id. Does not enumerate the on-disk feed catalog — only
   * queues that have been instantiated.
   */
  private async _resolveObjectInKnownQueues(spaceId: SpaceId, objectId: ObjectId): Promise<Entity.Unknown | undefined> {
    const queueFactory = this._queueFactories.get(spaceId);
    if (!queueFactory) {
      return undefined;
    }
    for (const queue of queueFactory.knownQueues()) {
      const [obj] = await queue.getObjectsById([objectId]);
      if (obj) {
        return obj;
      }
    }
    return undefined;
  }

  private async _resolveDatabaseObjectAsync(spaceId: SpaceId, objectId: ObjectId): Promise<Entity.Unknown | undefined> {
    const db = this._databases.get(spaceId);
    if (!db) {
      return undefined;
    }
    const [obj] = await db.query(Filter.id(objectId)).run();
    return obj;
  }

  private _resolveQueueSync(queueEchoUri: EchoURI.EchoURI): Queue | undefined {
    const spaceId = EchoURI.getSpaceId(queueEchoUri);
    if (!spaceId) {
      return undefined;
    }
    const queueFactory = this._queueFactories.get(spaceId);
    if (!queueFactory) {
      return undefined;
    }
    // Use `tryGet` rather than `get` so we don't manufacture a phantom queue for a URI
    // that just happens to share an ECHO object id — we only resolve to a queue when one
    // has been explicitly created (e.g. by a prior Feed.append/query for that feed).
    return queueFactory.tryGet(queueEchoUri);
  }

  private async _resolveQueueObjectAsync(
    queueEchoUri: EchoURI.EchoURI,
    objectId: ObjectId,
  ): Promise<Entity.Unknown | undefined> {
    const spaceId = EchoURI.getSpaceId(queueEchoUri);
    if (!spaceId) {
      return undefined;
    }
    const queueFactory = this._queueFactories.get(spaceId);
    if (!queueFactory) {
      return undefined;
    }
    const queue = queueFactory.get(queueEchoUri);
    if (!queue) {
      return undefined;
    }

    const [obj] = await queue.getObjectsById([objectId]);
    return obj;
  }

  registerQuerySourceProvider(provider: QuerySourceProvider): void {
    this._querySourceProviders.push(provider);
    for (const context of this._queryContexts.values()) {
      context.addQuerySource(provider.create());
    }
  }

  /**
   * Does not remove the provider from active query contexts.
   */
  unregisterQuerySourceProvider(provider: QuerySourceProvider): void {
    const index = this._querySourceProviders.indexOf(provider);
    if (index !== -1) {
      this._querySourceProviders.splice(index, 1);
    }
  }

  private _onUpdate(updateEvent: ItemsUpdatedEvent): void {
    const listenerMap = this._resolveEvents.get(updateEvent.spaceId);
    if (listenerMap) {
      batchEvents(() => {
        // TODO(dmaretskyi): We only care about created items.
        for (const item of updateEvent.itemsUpdated) {
          const listeners = listenerMap.get(item.id);
          if (!listeners) {
            continue;
          }
          const db = this._databases.get(updateEvent.spaceId);
          if (!db) {
            continue;
          }
          const obj = db.getObjectById(item.id);
          if (!obj) {
            continue;
          }
          log('resolve', { spaceId: updateEvent.spaceId, objectId: obj.id });
          listeners.emit(obj);
          listenerMap.delete(item.id);
        }
      });
    }
    this._updateEvent.emit(updateEvent);
  }

  private _createLiveObjectQueryContext(): QueryContext {
    const context = new GraphQueryContext({
      onStart: () => {
        this._queryContexts.add(context);
      },
      onStop: () => {
        this._queryContexts.delete(context);
      },
    });

    for (const database of this._databases.values()) {
      context.addQuerySource(new SpaceQuerySource(database));
    }
    for (const provider of this._querySourceProviders) {
      context.addQuerySource(provider.create());
    }

    return context;
  }
}

export interface QuerySourceProvider {
  create(): QuerySource;
}

type ObjectDiagnostic = {
  objectId: string;
  spaceId: string;
  loadReason: string;
  loadedStack?: StackTrace;
  query?: string;
};

export const OBJECT_DIAGNOSTICS = new Map<string, ObjectDiagnostic>();

trace.diagnostic({
  id: 'referenced-objects',
  name: 'Referenced Objects (Client)',
  fetch: () => {
    return Array.from(OBJECT_DIAGNOSTICS.values()).map((object) => {
      return {
        objectId: object.objectId,
        spaceId: object.spaceId,
        loadReason: object.loadReason,
        creationStack: object.loadedStack?.getStack(),
        query: object.query,
      };
    });
  },
});
