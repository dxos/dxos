//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { StackTrace } from '@dxos/debug';
import { type Database, type Entity, Filter, type Hypergraph, Query, type QueryAST, Ref } from '@dxos/echo';
import { type AnyProperties, setRefResolver } from '@dxos/echo/internal';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { failedInvariant } from '@dxos/invariant';
import { DXN, type ObjectId, type QueueSubspaceTag, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { entry } from '@dxos/util';

import { type ItemsUpdatedEvent } from './core-db';
import { type EchoDatabaseImpl, RuntimeSchemaRegistry } from './proxy-db';
import {
  GraphQueryContext,
  type QueryContext,
  QueryResultImpl,
  type QuerySource,
  SpaceQuerySource,
  normalizeQuery,
} from './query';
import type { Queue, QueueFactory } from './queue';

const TRACE_REF_RESOLUTION = false;

/**
 * Manages cross-space database interactions.
 */
export class HypergraphImpl implements Hypergraph.Hypergraph {
  private readonly _databases = new Map<SpaceId, EchoDatabaseImpl>();
  private readonly _queueFactories = new Map<SpaceId, QueueFactory>();

  // TODO(burdon): Comment/rename?
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
  // TODO(burdon): When is the owner not a space?
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

  private _query(query: Query.Any | Filter.Any, options?: Database.QueryOptions & QueryAST.QueryOptions) {
    query = Filter.is(query) ? Query.select(query) : query;
    return new QueryResultImpl(this._createLiveObjectQueryContext(), normalizeQuery(query, options));
  }

  /**
   * Creates a reference to an existing object in the database.
   *
   * NOTE: The reference may be dangling if the object is not present in the database.
   *
   * ## Difference from `Ref.fromDXN`
   *
   * `Ref.fromDXN(dxn)` returns an unhydrated reference. The `.load` and `.target` APIs will not work.
   * `graph.ref(dxn)` is preferable in cases with access to the database.
   *
   */
  makeRef<T extends AnyProperties = any>(dxn: DXN): Ref.Ref<T> {
    const ref = Ref.fromDXN(dxn);
    setRefResolver(ref, this.createRefResolver({}));
    return ref;
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
      resolveSync: (dxn, load, onLoad) => {
        // TODO(dmaretskyi): Add queue objects.
        if (dxn.kind === DXN.kind.QUEUE && dxn.asQueueDXN()?.objectId === undefined) {
          const { spaceId, subspaceTag, queueId } = dxn.asQueueDXN()!;
          return this._resolveQueueSync(spaceId, subspaceTag as QueueSubspaceTag, queueId);
        } else if (dxn.kind === DXN.kind.QUEUE && dxn.asQueueDXN()?.objectId !== undefined) {
          const { spaceId, subspaceTag, queueId, objectId } = dxn.asQueueDXN()!;
          const queue = this._resolveQueueSync(spaceId, subspaceTag as QueueSubspaceTag, queueId);
          const object = queue?.objects.find((obj) => obj.id === objectId);
          if (object) {
            return middleware(object);
          } else if (queue && load && onLoad) {
            queue.refresh().then(
              () => onLoad(),
              (err) => log.catch(err),
            );
            return undefined;
          }
        }

        if (dxn.kind !== DXN.kind.ECHO) {
          return undefined; // Unsupported DXN kind.
        }

        const res = this._resolveSync(dxn, context, onLoad);

        if (res) {
          return middleware(res);
        } else {
          return undefined;
        }
      },

      resolve: async (dxn) => {
        const obj = await this._resolveAsync(dxn, context);
        if (obj) {
          return middleware(obj);
        } else {
          return undefined;
        }
      },

      resolveSchema: async (dxn) => {
        const beginTime = TRACE_REF_RESOLUTION ? performance.now() : 0;
        let status: string = '';
        try {
          switch (dxn.kind) {
            case DXN.kind.TYPE: {
              const schema = this.schemaRegistry.getSchemaByDXN(dxn);
              status = schema != null ? 'resolved' : 'missing';
              return schema;
            }
            case DXN.kind.ECHO: {
              status = 'error';
              throw new Error('Not implemented: Resolving schema stored in the database');
            }
            default: {
              status = 'unknown dxn';
              return undefined;
            }
          }
        } finally {
          if (TRACE_REF_RESOLUTION) {
            log.info('resolveSchema', {
              dxn: dxn.toString(),
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
    dxn: DXN,
    context: Hypergraph.RefResolutionContext,
    onResolve?: (obj: Entity.Any) => void,
  ): Entity.Any | undefined {
    if (!dxn.asEchoDXN()) {
      throw new Error('Unsupported DXN kind');
    }

    const { spaceId = context.space, echoId: objectId } = dxn.asEchoDXN()!;
    if (spaceId === undefined) {
      throw new Error(`Unable to determine the Space to resolve the reference: ${dxn.toString()}`);
    }

    const db = this._databases.get(spaceId);
    if (db) {
      // Resolve remote reference.
      const obj = db.getObjectById(objectId);
      if (obj) {
        return obj;
      }
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
    dxn: DXN,
    context: Hypergraph.RefResolutionContext,
  ): Promise<Entity.Unknown | Queue | undefined> {
    const beginTime = TRACE_REF_RESOLUTION ? performance.now() : 0;
    let status: string = '';
    try {
      switch (dxn.kind) {
        case DXN.kind.ECHO: {
          if (!dxn.isLocalObjectId() && dxn.asEchoDXN()?.spaceId !== context.space) {
            status = 'error';
            throw new Error('Cross-space references are not yet supported');
          }
          const { echoId } = dxn.asEchoDXN() ?? failedInvariant();

          if (context.queue) {
            const { subspaceTag, spaceId, queueId } = context.queue.asQueueDXN() ?? failedInvariant();
            const obj = await this._resolveQueueObjectAsync(spaceId, subspaceTag as QueueSubspaceTag, queueId, echoId);
            if (obj) {
              status = 'resolved';
              return obj;
            }
          }

          if (!context.space) {
            status = 'error';
            throw new Error('Resolving context-free references is not supported');
          }

          const obj = await this._resolveDatabaseObjectAsync(context.space, echoId);
          if (obj) {
            status = 'resolved';
            return obj;
          }

          status = 'missing';
          return undefined;
        }
        case DXN.kind.QUEUE: {
          const { subspaceTag, spaceId, queueId, objectId } = dxn.asQueueDXN() ?? failedInvariant();
          if (!objectId) {
            status = 'error';
            return this._resolveQueueSync(spaceId, subspaceTag as QueueSubspaceTag, queueId);
          }

          const obj = await this._resolveQueueObjectAsync(spaceId, subspaceTag as QueueSubspaceTag, queueId, objectId);
          if (obj) {
            status = 'resolved';
            return obj;
          }

          status = 'missing queue';
          return undefined;
        }
        default: {
          status = 'error';
          throw new Error(`Unsupported DXN kind: ${dxn.kind}`);
        }
      }
    } finally {
      if (TRACE_REF_RESOLUTION) {
        log.info('resolve', {
          dxn: dxn.toString(),
          status,
          time: performance.now() - beginTime,
        });
      }
    }
  }

  private async _resolveDatabaseObjectAsync(spaceId: SpaceId, objectId: ObjectId): Promise<Entity.Unknown | undefined> {
    const db = this._databases.get(spaceId);
    if (!db) {
      return undefined;
    }
    const [obj] = await db.query(Filter.id(objectId)).run();
    return obj;
  }

  private _resolveQueueSync(spaceId: SpaceId, subspaceTag: QueueSubspaceTag, queueId: ObjectId): Queue | undefined {
    const queueFactory = this._queueFactories.get(spaceId);
    if (!queueFactory) {
      return undefined;
    }
    return queueFactory.get(DXN.fromQueue(subspaceTag, spaceId, queueId));
  }

  private async _resolveQueueObjectAsync(
    spaceId: SpaceId,
    subspaceTag: QueueSubspaceTag,
    queueId: ObjectId,
    objectId: ObjectId,
  ): Promise<Entity.Unknown | undefined> {
    const queueFactory = this._queueFactories.get(spaceId);
    if (!queueFactory) {
      return undefined;
    }
    const queue = queueFactory.get(DXN.fromQueue(subspaceTag, spaceId, queueId));
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
      compositeRuntime.batch(() => {
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
