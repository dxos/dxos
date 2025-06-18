//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { raise, StackTrace } from '@dxos/debug';
import type { Ref } from '@dxos/echo';
import { Reference } from '@dxos/echo-protocol';
import {
  Filter,
  ImmutableSchema,
  Query,
  RuntimeSchemaRegistry,
  type BaseObject,
  type BaseSchema,
  type ObjectId,
} from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { DXN, PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { ComplexMap, entry } from '@dxos/util';

import { type ItemsUpdatedEvent } from './core-db';
import { type AnyLiveObject } from './echo-handler';
import { type EchoDatabase, type EchoDatabaseImpl } from './proxy-db';
import {
  GraphQueryContext,
  normalizeQuery,
  QueryResult,
  ResultFormat,
  SpaceQuerySource,
  type QueryContext,
  type QueryFn,
  type QueryOptions,
  type QuerySource,
} from './query';

const TRACE_REF_RESOLUTION = true;

/**
 * Manages cross-space database interactions.
 */
export class Hypergraph {
  /**
   * Used for References resolution.
   * @deprecated use SpaceId.
   * TODO(mykola): Delete on References migration.
   */
  private readonly _spaceKeyToId = new ComplexMap<PublicKey, SpaceId>(PublicKey.hash);
  private readonly _databases = new Map<SpaceId, EchoDatabaseImpl>();
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
  _register(
    spaceId: SpaceId,
    /** @deprecated Use spaceId */
    spaceKey: PublicKey,
    database: EchoDatabaseImpl,
    owningObject?: unknown,
  ): void {
    this._spaceKeyToId.set(spaceKey, spaceId);
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

  _unregister(spaceId: SpaceId): void {
    // TODO(dmaretskyi): Remove db from query contexts.
    this._databases.delete(spaceId);
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
    // TODO(dmaretskyi): Consider plain format by default.
    const resultFormat = options?.format ?? ResultFormat.Live;

    if (typeof resultFormat !== 'string') {
      throw new TypeError('Invalid result format');
    }

    switch (resultFormat) {
      // TODO(dmaretskyi): Remove.
      case ResultFormat.Plain: {
        const spaceIds = options?.spaceIds;
        invariant(spaceIds && spaceIds.length === 1, 'Plain format requires a single space.');
        return new QueryResult(
          this._createPlainObjectQueryContext(spaceIds[0] as SpaceId),
          normalizeQuery(query, options),
        );
      }
      case ResultFormat.Live: {
        return new QueryResult(this._createLiveObjectQueryContext(), normalizeQuery(query, options));
      }
      // TODO(dmaretskyi): Remove.
      case ResultFormat.AutomergeDocAccessor: {
        throw new Error('Not implemented: ResultFormat.AutomergeDocAccessor');
      }
      default: {
        throw new TypeError(`Invalid result format: ${resultFormat}`);
      }
    }
  }

  /**
   * @param hostDb Host database for reference resolution.
   * @param middleware Called with the loaded object. The caller may change the object.
   * @returns Result of `onLoad`.
   */
  // TODO(dmaretskyi): Restructure API: Remove middleware, move `hostDb` into context option. Make accessible on Database objects.
  getRefResolver(hostDb: EchoDatabase, middleware: (obj: BaseObject) => BaseObject = (obj) => obj): Ref.Resolver {
    // TODO(dmaretskyi): Cache per hostDb.
    return {
      // TODO(dmaretskyi): Respect `load` flag.
      resolveSync: (dxn, load, onLoad) => {
        // TODO(dmaretskyi): Add queues.

        if (dxn.kind !== DXN.kind.ECHO) {
          return undefined; // Unsupported DXN kind.
        }

        const ref = Reference.fromDXN(dxn);
        const res = this._lookupRef(hostDb, ref, onLoad ?? (() => {}));

        if (res) {
          return middleware(res);
        } else {
          return undefined;
        }
      },
      resolve: async (dxn) => {
        let beginTime = TRACE_REF_RESOLUTION ? performance.now() : 0,
          status: string = '';
        try {
          if (dxn.kind !== DXN.kind.ECHO) {
            status = 'error';
            throw new Error('Unsupported DXN kind');
          }

          if (!dxn.isLocalObjectId()) {
            status = 'error';
            throw new Error('Cross-space references are not supported');
          }
          const {
            objects: [obj],
          } = await hostDb.query(Filter.ids(dxn.parts[1])).run();
          if (obj) {
            status = 'resolved';
            return middleware(obj);
          } else {
            status = 'missing';
            return undefined;
          }
        } finally {
          if (TRACE_REF_RESOLUTION) {
            log.info('resolve', { dxn: dxn.toString(), status, time: performance.now() - beginTime });
          }
        }
      },

      resolveSchema: async (dxn) => {
        let beginTime = TRACE_REF_RESOLUTION ? performance.now() : 0,
          status: string = '';
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
   * @internal
   * @param db
   * @param ref
   * @param onResolve will be weakly referenced.
   */
  _lookupRef(
    db: EchoDatabase,
    ref: Reference,
    onResolve: (obj: AnyLiveObject<any>) => void,
  ): AnyLiveObject<any> | undefined {
    let spaceId: SpaceId | undefined, objectId: ObjectId | undefined;

    if (ref.dxn && ref.dxn.asEchoDXN()) {
      const dxnData = ref.dxn.asEchoDXN()!;
      spaceId = dxnData.spaceId;
      objectId = dxnData.echoId;
    } else {
      // TODO(dmaretskyi): Legacy resoltion -- remove.
      objectId = ref.objectId;
      const spaceKey = ref.host ? PublicKey.from(ref.host) : db?.spaceKey;
      const mappedSpaceId = this._spaceKeyToId.get(spaceKey);
      invariant(mappedSpaceId, 'No spaceId for spaceKey.');
      spaceId = mappedSpaceId;
    }

    if (spaceId === undefined) {
      const local = db.getObjectById(objectId);
      if (local) {
        return local;
      }
    } else {
      const remoteDb = this._databases.get(spaceId);
      if (remoteDb) {
        // Resolve remote reference.
        const remote = remoteDb.getObjectById(objectId);
        if (remote) {
          return remote;
        }
      }
    }

    // Assume local database.
    spaceId ??= db.spaceId;

    if (!OBJECT_DIAGNOSTICS.has(objectId)) {
      OBJECT_DIAGNOSTICS.set(objectId, {
        objectId,
        spaceId,
        loadReason: 'reference access',
        loadedStack: new StackTrace(),
      });
    }

    log('trap', { spaceId, objectId });
    entry(this._resolveEvents, spaceId)
      .orInsert(new Map())
      .deep(objectId)
      .orInsert(new Event())
      .value.on(new Context(), onResolve);
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

  private _createPlainObjectQueryContext(spaceId: SpaceId): QueryContext {
    const space = this._databases.get(spaceId) ?? raise(new Error(`Space not found: ${spaceId}`));
    return space._coreDatabase._createQueryContext();
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
