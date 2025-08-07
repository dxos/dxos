//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { StackTrace } from '@dxos/debug';
import { type Obj, type Ref, type Relation } from '@dxos/echo';
import { Filter, Query } from '@dxos/echo';
import {
  type AnyEchoObject,
  type BaseObject,
  type BaseSchema,
  ImmutableSchema,
  type ObjectId,
  RuntimeSchemaRegistry,
} from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { failedInvariant } from '@dxos/invariant';
import { DXN, type QueueSubspaceTag, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { entry } from '@dxos/util';

import { type ItemsUpdatedEvent } from './core-db';
import { type AnyLiveObject } from './echo-handler';
import { type EchoDatabase, type EchoDatabaseImpl } from './proxy-db';
import {
  GraphQueryContext,
  type QueryContext,
  type QueryFn,
  type QueryOptions,
  QueryResult,
  type QuerySource,
  SpaceQuerySource,
  normalizeQuery,
} from './query';
import type { Queue, QueueFactory } from './queue';

{
  const a: Obj.Any | Relation.Any = null as any;
  const b: AnyEchoObject = null as any;
}

const TRACE_REF_RESOLUTION = false;

/**
 * Resolution context.
 * Affects how non-absolute DXNs are resolved.
 */
export interface RefResolutionContext {
  /**
   * Space that the resolution is happening from.
   */
  space?: SpaceId;

  /**
   * Queue that the resolution is happening from.
   * This queue will be searched first, and then the space it belongs to.
   */
  queue?: DXN;
}

export interface RefResolverOptions {
  /**
   * Resolution context.
   * Affects how non-absolute DXNs are resolved.
   */
  context?: RefResolutionContext;

  /**
   * Middleware to change the resolved object before returning it.
   * @deprecated On track to be removed.
   */
  middleware?: (obj: BaseObject) => BaseObject;
}

/**
 * Manages cross-space database interactions.
 */
export class Hypergraph {
  private readonly _databases = new Map<SpaceId, EchoDatabaseImpl>();
  private readonly _queueFactories = new Map<SpaceId, QueueFactory>();

  // TODO(burdon): Comment/rename?
  private readonly _owningObjects = new Map<SpaceId, unknown>();
  private readonly _schemaRegistry = new RuntimeSchemaRegistry();
  private readonly _updateEvent = new Event<ItemsUpdatedEvent>();
  private readonly _resolveEvents = new Map<SpaceId, Map<string, Event<AnyLiveObject<any>>>>();
  private readonly _queryContexts = new Set<GraphQueryContext>();
  private readonly _querySourceProviders: QuerySourceProvider[] = [];

  get schemaRegistry(): RuntimeSchemaRegistry {
    return this._schemaRegistry;
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Use DXN.
  // TODO(burdon): Ensure static and dynamic schema do not have overlapping type names.
  async getSchemaByTypename(typename: string, db: EchoDatabase): Promise<BaseSchema | undefined> {
    const schema = this.schemaRegistry.getSchema(typename);
    if (schema) {
      return new ImmutableSchema(schema);
    }

    return await db.schemaRegistry.query({ typename }).firstOrUndefined();
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
  declare query: QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(query: Query.Any | Filter.Any, options?: QueryOptions) {
    query = Filter.is(query) ? Query.select(query) : query;
    return new QueryResult(this._createLiveObjectQueryContext(), normalizeQuery(query, options));
  }

  /**
   * @param hostDb Host database for reference resolution.
   * @param middleware Called with the loaded object. The caller may change the object.
   * @returns Result of `onLoad`.
   */
  // TODO(dmaretskyi): Restructure API: Remove middleware, move `hostDb` into context option. Make accessible on Database objects.
  createRefResolver({ context = {}, middleware = (obj) => obj }: RefResolverOptions): Ref.Resolver {
    // TODO(dmaretskyi): Rewrite resolution algorithm with tracks for absolute and relative DXNs.

    return {
      // TODO(dmaretskyi): Respect `load` flag.
      resolveSync: (dxn, load, onLoad) => {
        // TODO(dmaretskyi): Add queue objects.
        if (dxn.kind === DXN.kind.QUEUE && dxn.asQueueDXN()?.objectId === undefined) {
          const { spaceId, subspaceTag, queueId } = dxn.asQueueDXN()!;
          return this._resolveQueueSync(spaceId, subspaceTag as QueueSubspaceTag, queueId);
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
            log.info('resolveSchema', { dxn: dxn.toString(), status, time: performance.now() - beginTime });
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
    context: RefResolutionContext,
    onResolve?: (obj: AnyLiveObject<BaseObject>) => void,
  ): AnyLiveObject<BaseObject> | undefined {
    if (!dxn.asEchoDXN()) {
      throw new Error('Unsupported DXN kind');
    }
    const dxnData = dxn.asEchoDXN()!;
    const spaceId = dxnData.spaceId ?? context.space;
    const objectId = dxnData.echoId;

    if (spaceId === undefined) {
      throw new Error('Unable to determine space to resolve the reference from');
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

  private async _resolveAsync(dxn: DXN, context: RefResolutionContext): Promise<AnyEchoObject | Queue | undefined> {
    const beginTime = TRACE_REF_RESOLUTION ? performance.now() : 0;
    let status: string = '';
    try {
      switch (dxn.kind) {
        case DXN.kind.ECHO: {
          if (!dxn.isLocalObjectId()) {
            status = 'error';
            throw new Error('Cross-space references are not supported');
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
        log.info('resolve', { dxn: dxn.toString(), status, time: performance.now() - beginTime });
      }
    }
  }

  private async _resolveDatabaseObjectAsync(
    spaceId: SpaceId,
    objectId: ObjectId,
  ): Promise<Obj.Any | Relation.Any | undefined> {
    const db = this._databases.get(spaceId);
    if (!db) {
      return undefined;
    }
    const {
      objects: [obj],
    } = await db.query(Filter.ids(objectId)).run();
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
  ): Promise<AnyEchoObject | undefined> {
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
