//
// Copyright 2022 DXOS.org
//

import { asyncTimeout, Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { raise, StackTrace } from '@dxos/debug';
import { Reference } from '@dxos/echo-protocol';
import { RuntimeSchemaRegistry, type BaseObject } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';
import type { RefResolver } from '@dxos/live-object';
import { log } from '@dxos/log';
import { QueryOptions as QueryOptionsProto } from '@dxos/protocols/proto/dxos/echo/filter';
import { trace } from '@dxos/tracing';
import { ComplexMap, entry } from '@dxos/util';

import { type ItemsUpdatedEvent, type ObjectCore } from './core-db';
import { type ReactiveEchoObject, getObjectCore } from './echo-handler';
import { prohibitSignalActions } from './guarded-scope';
import { type EchoDatabase, type EchoDatabaseImpl } from './proxy-db';
import {
  Filter,
  filterMatch,
  type FilterSource,
  optionsToProto,
  Query,
  type QueryContext,
  type QueryFn,
  type QueryOptions,
  type QueryResult,
  type QueryRunOptions,
  ResultFormat,
} from './query';

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
  private readonly _resolveEvents = new Map<SpaceId, Map<string, Event<ReactiveEchoObject<any>>>>();

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
        return new Query(
          this._createPlainObjectQueryContext(spaceIds[0] as SpaceId),
          Filter.from(filter, optionsToProto(options ?? {})),
        );
      }
      case ResultFormat.Live: {
        return new Query(this._createLiveObjectQueryContext(), Filter.from(filter, optionsToProto(options ?? {})));
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
        const ref = Reference.fromDXN(dxn);
        const res = this._lookupRef(hostDb, ref, onLoad ?? (() => {}));

        if (res) {
          return middleware(res);
        } else {
          return undefined;
        }
      },
      resolve: async (dxn) => {
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
    onResolve: (obj: ReactiveEchoObject<any>) => void,
  ): ReactiveEchoObject<any> | undefined {
    if (ref.host === undefined) {
      const local = db.getObjectById(ref.objectId);
      if (local) {
        return local;
      }
    }

    const spaceKey = ref.host ? PublicKey.from(ref.host) : db?.spaceKey;
    const spaceId = this._spaceKeyToId.get(spaceKey);
    invariant(spaceId, 'No spaceId for spaceKey.');
    if (ref.host) {
      const remoteDb = this._databases.get(spaceId);
      if (remoteDb) {
        // Resolve remote reference.
        const remote = remoteDb.getObjectById(ref.objectId);
        if (remote) {
          return remote;
        }
      }
    }

    if (!OBJECT_DIAGNOSTICS.has(ref.objectId)) {
      OBJECT_DIAGNOSTICS.set(ref.objectId, {
        objectId: ref.objectId,
        spaceKey: spaceKey.toHex(),
        loadReason: 'reference access',
        loadedStack: new StackTrace(),
      });
    }

    log('trap', { spaceKey, objectId: ref.objectId });
    entry(this._resolveEvents, spaceId)
      .orInsert(new Map())
      .deep(ref.objectId)
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

  getResults(): QueryResult[];

  /**
   * One-shot query.
   */
  run(filter: Filter): Promise<QueryResult[]>;

  /**
   * Set the filter and trigger continuous updates.
   */
  update(filter: Filter): void;
}

/**
 * Aggregates multiple query sources.
 */
export class GraphQueryContext implements QueryContext {
  private readonly _sources = new Set<QuerySource>();

  private _filter?: Filter = undefined;

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
      if (this._filter) {
        source.update(this._filter);
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

  getResults(): QueryResult[] {
    if (!this._filter) {
      return [];
    }
    return this._filterResults(
      this._filter,
      Array.from(this._sources).flatMap((source) => source.getResults()),
    );
  }

  async run(filter: Filter, { timeout = 30_000 }: QueryRunOptions = {}): Promise<QueryResult[]> {
    const runTasks = [...this._sources.values()].map((s) => asyncTimeout<QueryResult[]>(s.run(filter), timeout));
    if (runTasks.length === 0) {
      return [];
    }
    const mergedResults = (await Promise.all(runTasks)).flatMap((r) => r ?? []);
    const filteredResults = this._filterResults(filter, mergedResults);
    return filteredResults;
  }

  update(filter: Filter): void {
    this._filter = filter;
    for (const source of this._sources) {
      source.update(filter);
    }
  }

  addQuerySource(querySource: QuerySource) {
    this._sources.add(querySource);
    if (this._ctx != null) {
      querySource.changed.on(this._ctx, () => {
        this.changed.emit();
      });
    }
    if (this._filter) {
      querySource.update(this._filter);
    }
  }

  private _filterResults(filter: Filter, results: QueryResult[]): QueryResult[] {
    return results.filter(
      (result) => result.object && filterMatch(filter, getObjectCore(result.object), result.object),
    );
  }
}

/**
 * Queries objects from the local working set.
 */
class SpaceQuerySource implements QuerySource {
  public readonly changed = new Event<void>();

  private _ctx: Context = new Context();
  private _filter: Filter | undefined = undefined;
  private _results?: QueryResult<ReactiveEchoObject<any>>[] = undefined;

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
    if (!this._filter) {
      return;
    }

    prohibitSignalActions(() => {
      // TODO(dmaretskyi): Could be optimized to recompute changed only to the relevant space.
      const changed = updateEvent.itemsUpdated.some(({ id: objectId }) => {
        const echoObject = this._database.getObjectById(objectId);
        const core = this._database.coreDatabase.getObjectCoreById(objectId, { load: false });

        return (
          !this._results ||
          this._results.find((result) => result.id === objectId) ||
          (core && !core.isDeleted() && filterMatch(this._filter!, core, echoObject))
        );
      });

      if (changed) {
        this._results = undefined;
        this.changed.emit();
      }
    });
  };

  async run(filter: Filter): Promise<QueryResult<ReactiveEchoObject<any>>[]> {
    if (!this._isValidSourceForFilter(filter)) {
      return [];
    }

    if (filter.isObjectIdFilter()) {
      const cores = (await this._database._coreDatabase.batchLoadObjectCores(filter.objectIds!)).filter(
        (x) => x !== undefined,
      );
      return cores.map((core) => this._mapCoreToResult(core));
    }

    let results: QueryResult<ReactiveEchoObject<any>>[] = [];
    prohibitSignalActions(() => {
      results = this._query(filter);
    });
    return results;
  }

  getResults(): QueryResult<ReactiveEchoObject<any>>[] {
    if (!this._filter) {
      return [];
    }

    if (!this._results) {
      prohibitSignalActions(() => {
        this._results = this._query(this._filter!);
      });
    }

    return this._results!;
  }

  update(filter: Filter<ReactiveEchoObject<any>>): void {
    if (!this._isValidSourceForFilter(filter)) {
      this._filter = undefined;
      return;
    }

    void this._ctx.dispose().catch(() => {});
    this._ctx = new Context();
    this._filter = filter;

    this._database.coreDatabase._updateEvent.on(this._ctx, this._onUpdate);

    this._results = undefined;
    this.changed.emit();
  }

  private _query(filter: Filter): QueryResult<ReactiveEchoObject<any>>[] {
    const filteredCores = filter.isObjectIdFilter()
      ? filter
          .objectIds!.map((id) => this._database.coreDatabase.getObjectCoreById(id, { load: true }))
          .filter((core) => core !== undefined)
      : this._database.coreDatabase
          .allObjectCores()
          // TODO(dmaretskyi): Cleanup proxy <-> core.
          .filter((core) => filterMatch(filter, core, this._database.getObjectById(core.id, { deleted: true })));

    return filteredCores.map((core) => this._mapCoreToResult(core));
  }

  private _isValidSourceForFilter(filter: Filter<ReactiveEchoObject<any>>): boolean {
    // Disabled by spaces filter.
    if (filter.spaceIds !== undefined && !filter.spaceIds.some((id) => id === this.spaceId)) {
      return false;
    } else if (filter.spaceKeys !== undefined && !filter.spaceKeys.some((key) => key.equals(this.spaceKey))) {
      // Space ids take precedence over deprecated space keys.
      return false;
    }
    // Disabled by dataLocation filter.
    if (filter.options.dataLocation && filter.options.dataLocation === QueryOptionsProto.DataLocation.REMOTE) {
      return false;
    }
    return true;
  }

  private _mapCoreToResult(core: ObjectCore): QueryResult<ReactiveEchoObject<any>> {
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
}

type ObjectDiagnostic = {
  objectId: string;
  spaceKey: string;
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
        spaceKey: object.spaceKey,
        loadReason: object.loadReason,
        creationStack: object.loadedStack?.getStack(),
        query: object.query,
      };
    });
  },
});
