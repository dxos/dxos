//
// Copyright 2022 DXOS.org
//

import { isNotUndefined } from 'effect/Predicate';

import { asyncTimeout, Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { raise, StackTrace } from '@dxos/debug';
import { filterMatchObject } from '@dxos/echo-pipeline/filter';
import { Reference, type QueryAST } from '@dxos/echo-protocol';
import {
  type BaseSchema,
  RuntimeSchemaRegistry,
  type BaseObject,
  type ObjectId,
  ImmutableSchema,
  type RefResolver,
} from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId, DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { ComplexMap, entry } from '@dxos/util';

import { type ItemsUpdatedEvent, type ObjectCore } from './core-db';
import { type AnyLiveObject } from './echo-handler';
import { prohibitSignalActions } from './guarded-scope';
import { type EchoDatabase, type EchoDatabaseImpl } from './proxy-db';
import {
  type FilterSource,
  QueryResult,
  type QueryContext,
  type QueryFn,
  type QueryOptions,
  type QueryResultEntry,
  type QueryRunOptions,
  ResultFormat,
  normalizeQuery,
} from './query';
import { getTargetSpacesForQuery, isTrivialSelectionQuery } from './query/util';

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
  ) {
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

  _unregister(spaceId: SpaceId) {
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

  private _query(filter?: FilterSource, options?: QueryOptions) {
    const spaces = options?.spaces;
    invariant(!spaces || spaces.every((space) => space instanceof PublicKey), 'Invalid spaces filter');

    // TODO(dmaretskyi): Consider plain format by default.
    const resultFormat = options?.format ?? ResultFormat.Live;

    if (typeof resultFormat !== 'string') {
      throw new TypeError('Invalid result format');
    }

    switch (resultFormat) {
      case ResultFormat.Plain: {
        const spaceIds = options?.spaceIds;
        invariant(spaceIds && spaceIds.length === 1, 'Plain format requires a single space.');
        return new QueryResult(
          this._createPlainObjectQueryContext(spaceIds[0] as SpaceId),
          normalizeQuery(filter, options),
        );
      }
      case ResultFormat.Live: {
        return new QueryResult(this._createLiveObjectQueryContext(), normalizeQuery(filter, options));
      }
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
  getRefResolver(hostDb: EchoDatabase, middleware: (obj: BaseObject) => BaseObject = (obj) => obj): RefResolver {
    // TODO(dmaretskyi): Cache per hostDb.
    return {
      // TODO(dmaretskyi): Respect `load` flag.
      resolveSync: (dxn, load, onLoad) => {
        if (dxn.kind !== DXN.kind.ECHO) {
          throw new Error('Unsupported DXN kind');
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
        if (dxn.kind !== DXN.kind.ECHO) {
          throw new Error('Unsupported DXN kind');
        }

        if (!dxn.isLocalObjectId()) {
          throw new Error('Cross-space references are not supported');
        }
        const {
          objects: [obj],
        } = await hostDb.query({ id: dxn.parts[1] }).run();
        if (obj) {
          return middleware(obj);
        } else {
          return undefined;
        }
      },
    };
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

  registerQuerySourceProvider(provider: QuerySourceProvider) {
    this._querySourceProviders.push(provider);
    for (const context of this._queryContexts.values()) {
      context.addQuerySource(provider.create());
    }
  }

  /**
   * Does not remove the provider from active query contexts.
   */
  unregisterQuerySourceProvider(provider: QuerySourceProvider) {
    const index = this._querySourceProviders.indexOf(provider);
    if (index !== -1) {
      this._querySourceProviders.splice(index, 1);
    }
  }

  private _onUpdate(updateEvent: ItemsUpdatedEvent) {
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

export type GraphQueryContextParams = {
  // TODO(dmaretskyi): Make async.
  onStart: () => void;

  onStop: () => void;
};

/**
 * Query data source.
 * Implemented by a space or a remote agent.
 * Each query has a separate instance.
 */
export interface QuerySource {
  // TODO(dmaretskyi): Update info?
  changed: Event<void>;

  // TODO(dmaretskyi): Make async.
  open(): void;

  // TODO(dmaretskyi): Make async.
  close(): void;

  getResults(): QueryResultEntry[];

  /**
   * One-shot query.
   */
  run(query: QueryAST.Query): Promise<QueryResultEntry[]>;

  /**
   * Set the filter and trigger continuous updates.
   */
  update(query: QueryAST.Query): void;
}

/**
 * Aggregates multiple query sources.
 */
export class GraphQueryContext implements QueryContext {
  private readonly _sources = new Set<QuerySource>();

  private _query?: QueryAST.Query = undefined;

  private _ctx?: Context = undefined;

  public changed = new Event<void>();

  constructor(private readonly _params: GraphQueryContextParams) {}

  get sources(): ReadonlySet<QuerySource> {
    return this._sources;
  }

  start() {
    this._ctx = new Context();
    this._params.onStart();
    for (const source of this._sources) {
      if (this._query) {
        source.update(this._query);
      }

      // Subscribing after `update` means that we will intentionally skip any `changed` events generated by update.
      source.changed.on(this._ctx, () => {
        this.changed.emit();
      });
    }
  }

  stop() {
    void this._ctx?.dispose();
    for (const source of this.sources) {
      source.close();
    }
    this._params.onStop();
  }

  getResults(): QueryResultEntry[] {
    if (!this._query) {
      return [];
    }
    return Array.from(this._sources).flatMap((source) => source.getResults());
  }

  async run(query: QueryAST.Query, { timeout = 30_000 }: QueryRunOptions = {}): Promise<QueryResultEntry[]> {
    const runTasks = [...this._sources.values()].map(async (s) => {
      try {
        log('run query', { resolver: Object.getPrototypeOf(s).constructor.name });
        const results = await asyncTimeout<QueryResultEntry[]>(s.run(query), timeout);
        log('run query results', { resolver: Object.getPrototypeOf(s).constructor.name, count: results.length });
        return results;
      } catch (err) {
        log('run query error', { resolver: Object.getPrototypeOf(s).constructor.name, error: err });
        throw err;
      }
    });
    if (runTasks.length === 0) {
      return [];
    }
    const mergedResults = (await Promise.all(runTasks)).flatMap((r) => r ?? []);
    return mergedResults;
  }

  update(query: QueryAST.Query): void {
    this._query = query;
    for (const source of this._sources) {
      source.update(query);
    }
  }

  addQuerySource(querySource: QuerySource) {
    this._sources.add(querySource);
    if (this._ctx != null) {
      querySource.changed.on(this._ctx, () => {
        this.changed.emit();
      });
    }
    if (this._query) {
      querySource.update(this._query);
    }
  }
}

/**
 * Queries objects from the local working set.
 */
class SpaceQuerySource implements QuerySource {
  public readonly changed = new Event<void>();

  private _ctx: Context = new Context();
  private _query: QueryAST.Query | undefined = undefined;
  private _results?: QueryResultEntry<AnyLiveObject<any>>[] = undefined;

  constructor(private readonly _database: EchoDatabaseImpl) {}

  get spaceId() {
    return this._database.spaceId;
  }

  get spaceKey() {
    return this._database.spaceKey;
  }

  open(): void {}

  close() {
    this._results = undefined;
    void this._ctx.dispose().catch(() => {});
  }

  private _onUpdate = (updateEvent: ItemsUpdatedEvent) => {
    if (!this._query) {
      return;
    }

    prohibitSignalActions(() => {
      // TODO(dmaretskyi): Could be optimized to recompute changed only to the relevant space.
      const changed = updateEvent.itemsUpdated.some(({ id: objectId }) => {
        const core = this._database.coreDatabase.getObjectCoreById(objectId, { load: false });

        const trivial = isTrivialSelectionQuery(this._query!);
        if (!trivial) {
          return false;
        }

        const { filter, options } = trivial;

        return (
          !this._results ||
          this._results.find((result) => result.id === objectId) ||
          (core && this._filterCore(core, filter, options))
        );
      });

      if (changed) {
        this._results = undefined;
        this.changed.emit();
      }
    });
  };

  async run(query: QueryAST.Query): Promise<QueryResultEntry<AnyLiveObject<any>>[]> {
    if (!this._isValidSourceForQuery(query)) {
      return [];
    }

    const trivial = isTrivialSelectionQuery(query);
    if (!trivial) {
      return [];
    }

    const { filter, options } = trivial;

    const results: QueryResultEntry<AnyLiveObject<any>>[] = [];

    if (isObjectIdFilter(filter)) {
      results.push(
        ...(await this._database._coreDatabase.batchLoadObjectCores((filter as QueryAST.FilterObject).id as ObjectId[]))
          .filter(isNotUndefined)
          .filter((core) => this._filterCore(core, filter, options))
          .map((core) => this._mapCoreToResult(core)),
      );
    }

    prohibitSignalActions(() => {
      results.push(...this._queryWorkingSet(filter, options));
    });

    // Dedup
    const map = new Map<string, QueryResultEntry<AnyLiveObject<any>>>();
    for (const result of results) {
      map.set(result.id, result);
    }

    return [...map.values()];
  }

  getResults(): QueryResultEntry<AnyLiveObject<any>>[] {
    if (!this._query) {
      return [];
    }

    const trivial = isTrivialSelectionQuery(this._query);
    if (!trivial) {
      return [];
    }

    const { filter, options } = trivial;

    if (!this._results) {
      prohibitSignalActions(() => {
        this._results = this._queryWorkingSet(filter, options);
      });
    }

    return this._results!;
  }

  update(query: QueryAST.Query): void {
    if (!this._isValidSourceForQuery(query)) {
      this._query = undefined;
      return;
    }

    void this._ctx.dispose().catch(() => {});
    this._ctx = new Context();
    this._query = query;

    this._database.coreDatabase._updateEvent.on(this._ctx, this._onUpdate);

    this._results = undefined;
    this.changed.emit();
  }

  /**
   * Queries from already loaded objects.
   */
  private _queryWorkingSet(
    filter: QueryAST.Filter,
    options: QueryAST.QueryOptions | undefined,
  ): QueryResultEntry<AnyLiveObject<any>>[] {
    const filteredCores = isObjectIdFilter(filter)
      ? (filter as QueryAST.FilterObject)
          .id!.map((id) => this._database.coreDatabase.getObjectCoreById(id, { load: true }))
          .filter(isNotUndefined)
          .filter((core) => this._filterCore(core, filter, options))
      : this._database.coreDatabase.allObjectCores().filter((core) => this._filterCore(core, filter, options));

    return filteredCores.map((core) => this._mapCoreToResult(core));
  }

  private _isValidSourceForQuery(query: QueryAST.Query): boolean {
    const targetSpaces = getTargetSpacesForQuery(query);
    // Disabled by spaces filter.
    if (targetSpaces.length > 0 && !targetSpaces.includes(this.spaceId)) {
      return false;
    }

    return true;
  }

  private _mapCoreToResult(core: ObjectCore): QueryResultEntry<AnyLiveObject<any>> {
    return {
      id: core.id,
      spaceId: this.spaceId,
      spaceKey: this.spaceKey,
      object: this._database.getObjectById(core.id, { deleted: true }),
      resolution: {
        source: 'local',
        time: 0,
      },
    };
  }

  private _filterCore(core: ObjectCore, filter: QueryAST.Filter, options: QueryAST.QueryOptions | undefined): boolean {
    return (
      filterCoreByDeletedFlag(core, options) &&
      filterMatchObject(filter, {
        id: core.id,
        doc: core.getObjectStructure(),
        spaceId: this.spaceId,
      })
    );
  }
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

const isObjectIdFilter = (filter: QueryAST.Filter) => {
  return filter.type === 'object' && filter.id !== undefined && filter.id.length > 0;
};

const filterCoreByDeletedFlag = (core: ObjectCore, options: QueryAST.QueryOptions | undefined): boolean => {
  switch (options?.deleted) {
    case undefined:
    case 'exclude':
      return !core.isDeleted();
    case 'include':
      return true;
    case 'only':
      return core.isDeleted();
  }
};
