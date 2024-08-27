//
// Copyright 2022 DXOS.org
//

import { asyncTimeout, Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { StackTrace } from '@dxos/debug';
import { type Reference } from '@dxos/echo-protocol';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import { trace } from '@dxos/tracing';
import { ComplexMap, entry } from '@dxos/util';

import { getObjectCore, type ItemsUpdatedEvent } from './core-db';
import { prohibitSignalActions } from './guarded-scope';
import { type EchoDatabase, type EchoDatabaseImpl } from './proxy-db';
import {
  Filter,
  filterMatch,
  type FilterSource,
  Query,
  type QueryContext,
  type QueryResult,
  type QueryRunOptions,
} from './query';
import { RuntimeSchemaRegistry } from './runtime-schema-registry';

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
  private readonly _resolveEvents = new Map<SpaceId, Map<string, Event<EchoReactiveObject<any>>>>();

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

  /**
   * Filter by type.
   */
  query<T extends EchoReactiveObject<any>>(filter?: FilterSource<T>, options?: QueryOptions): Query<T> {
    const spaces = options?.spaces;
    invariant(!spaces || spaces.every((space) => space instanceof PublicKey), 'Invalid spaces filter');
    return new Query(this._createQueryContext(), Filter.from(filter, options));
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
    onResolve: (obj: EchoReactiveObject<any>) => void,
  ): EchoReactiveObject<any> | undefined {
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

  private _createQueryContext(): QueryContext {
    const context = new GraphQueryContext({
      onStart: () => {
        this._queryContexts.add(context);
      },
      onStop: () => {
        for (const source of context.sources) {
          source.close();
        }
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
  getResults(): QueryResult[];

  // TODO(dmaretskyi): Update info?
  changed: Event<void>;

  /**
   * One-shot query.
   */
  run(filter: Filter): Promise<QueryResult[]>;

  /**
   * Set the filter and trigger continuous updates.
   */
  update(filter: Filter): void;

  // TODO(dmaretskyi): Make async.
  close(): void;
}

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
      source.changed.on(this._ctx, () => {
        this.changed.emit();
      });
    }
  }

  stop() {
    void this._ctx?.dispose();
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

class SpaceQuerySource implements QuerySource {
  public readonly changed = new Event<void>();

  private _ctx: Context = new Context();
  private _filter: Filter | undefined = undefined;
  private _results?: QueryResult<EchoReactiveObject<any>>[] = undefined;

  constructor(private readonly _database: EchoDatabaseImpl) {}

  get spaceId() {
    return this._database.spaceId;
  }

  get spaceKey() {
    return this._database.spaceKey;
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

  async run(filter: Filter): Promise<QueryResult<EchoReactiveObject<any>>[]> {
    if (!this._isValidSourceForFilter(filter)) {
      return [];
    }
    let results: QueryResult<EchoReactiveObject<any>>[] = [];
    prohibitSignalActions(() => {
      results = this._query(filter);
    });
    return results;
  }

  getResults(): QueryResult<EchoReactiveObject<any>>[] {
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

  update(filter: Filter<EchoReactiveObject<any>>): void {
    if (!this._isValidSourceForFilter(filter)) {
      this._filter = undefined;
      return;
    }

    void this._ctx.dispose().catch();
    this._ctx = new Context();
    this._filter = filter;

    this._database.coreDatabase._updateEvent.on(this._ctx, this._onUpdate);

    this._results = undefined;
    this.changed.emit();
  }

  close() {
    this._filter = undefined;
    this._results = undefined;
    void this._ctx.dispose().catch();
  }

  private _query(filter: Filter): QueryResult<EchoReactiveObject<any>>[] {
    return (
      this._database.coreDatabase
        .allObjectCores()
        // TODO(dmaretskyi): Cleanup proxy <-> core.
        .filter((core) => filterMatch(filter, core, this._database.getObjectById(core.id, { deleted: true })))
        .map((core) => ({
          id: core.id,
          spaceId: this.spaceId,
          spaceKey: this.spaceKey,
          object: this._database.getObjectById(core.id, { deleted: true }),
          resolution: {
            source: 'local',
            time: 0,
          },
        }))
    );
  }

  private _isValidSourceForFilter(filter: Filter<EchoReactiveObject<any>>): boolean {
    // Disabled by spaces filter.
    if (filter.spaceKeys !== undefined && !filter.spaceKeys.some((key) => key.equals(this.spaceKey))) {
      return false;
    }
    // Disabled by dataLocation filter.
    if (filter.options.dataLocation && filter.options.dataLocation === QueryOptions.DataLocation.REMOTE) {
      return false;
    }
    return true;
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
