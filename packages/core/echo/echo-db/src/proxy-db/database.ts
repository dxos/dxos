//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';

import { type CleanupFn, Event, type ReadOnlyEvent, synchronized } from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { inspectObject } from '@dxos/debug';
import { Database, type Entity, Obj, type QueryAST, Ref } from '@dxos/echo';
import { type AnyProperties, assertObjectModel, setRefResolver } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { DXN, type PublicKey, type SpaceId } from '@dxos/keys';
import { getProxyTarget, isLiveObject } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import { type DataService, type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { defaultMap } from '@dxos/util';

import type { SaveStateChangedEvent } from '../automerge';
import { CoreDatabase, type LoadObjectOptions, type ObjectCore } from '../core-db';
import {
  EchoReactiveHandler,
  type ProxyTarget,
  createObject,
  getObjectCore,
  initEchoReactiveObjectRootProxy,
  isEchoObject,
} from '../echo-handler';
import { type HypergraphImpl } from '../hypergraph';
import { Filter, Query } from '../query';

import { DatabaseSchemaRegistry } from './database-schema-registry';
import { type ObjectMigration } from './object-migration';

// TODO(burdon): Remove and progressively push methods to Database.Database.
export interface EchoDatabase extends Database.Database {
  /**
   * Get notification about the data being saved to disk.
   */
  readonly saveStateChanged: ReadOnlyEvent<SaveStateChangedEvent>;

  /** @deprecated */
  readonly pendingBatch: ReadOnlyEvent<unknown>;

  /** @deprecated */
  readonly coreDatabase: CoreDatabase;

  /** @deprecated */
  get spaceKey(): PublicKey;

  // Overrides interface.
  get schemaRegistry(): DatabaseSchemaRegistry;

  // Overrides interface.
  get graph(): HypergraphImpl;

  /**
   * Run migrations.
   */
  runMigrations(migrations: ObjectMigration[]): Promise<void>;

  /**
   * Get the current sync state.
   */
  getSyncState(): Promise<SpaceSyncState>;

  /**
   * Get notification about the sync progress with other peers.
   */
  subscribeToSyncState(ctx: Context, callback: (state: SpaceSyncState) => void): CleanupFn;

  /**
   * Insert new objects.
   * @deprecated Use `add` instead.
   */
  insert(data: unknown): Promise<unknown>;

  /**
   * Update objects.
   * @deprecated Directly mutate the object.
   */
  update(filter: Filter.Any, operation: unknown): Promise<void>;
}

export type EchoDatabaseProps = {
  graph: HypergraphImpl;
  dataService: DataService;
  queryService: QueryService;
  spaceId: SpaceId;

  /**
   * Run a reactive query for a set of dynamic schema.
   * @default true
   */
  reactiveSchemaQuery?: boolean;

  preloadSchemaOnOpen?: boolean;

  /** @deprecated Use spaceId */
  spaceKey: PublicKey;
};

/**
 * API for the database.
 * Implements EchoDatabase interface.
 */
export class EchoDatabaseImpl extends Resource implements EchoDatabase {
  readonly [Database.TypeId]: typeof Database.TypeId = Database.TypeId;

  /**
   * @internal
   */
  readonly _coreDatabase: CoreDatabase;

  private readonly _schemaRegistry: DatabaseSchemaRegistry;

  /**
   * Mapping `object core` -> `root proxy` (User facing proxies).
   * @internal
   */
  readonly _rootProxies = new Map<ObjectCore, Obj.Any>();

  readonly saveStateChanged: ReadOnlyEvent<SaveStateChangedEvent>;

  private _rootUrl: string | undefined = undefined;

  constructor(params: EchoDatabaseProps) {
    super();

    this._coreDatabase = new CoreDatabase({
      graph: params.graph,
      dataService: params.dataService,
      queryService: params.queryService,
      spaceId: params.spaceId,
      spaceKey: params.spaceKey,
    });

    this._schemaRegistry = new DatabaseSchemaRegistry(this, {
      reactiveQuery: params.reactiveSchemaQuery,
      preloadSchemaOnOpen: params.preloadSchemaOnOpen,
    });

    this.saveStateChanged = this._coreDatabase.saveStateChanged;
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return this._coreDatabase.toJSON();
  }

  get spaceId(): SpaceId {
    return this._coreDatabase.spaceId;
  }

  /**
   * @deprecated Use `spaceId`.
   */
  get spaceKey(): PublicKey {
    return this._coreDatabase.spaceKey;
  }

  get rootUrl(): string | undefined {
    return this._rootUrl;
  }

  get graph(): HypergraphImpl {
    return this._coreDatabase.graph;
  }

  // TODO(burdon): Move into hypergraph.
  get schemaRegistry(): DatabaseSchemaRegistry {
    return this._schemaRegistry;
  }

  @synchronized
  protected override async _open(): Promise<void> {
    if (this._rootUrl !== undefined) {
      await this._coreDatabase.open({ rootUrl: this._rootUrl });
    }

    await this._schemaRegistry.open();
  }

  @synchronized
  protected override async _close(): Promise<void> {
    await this._schemaRegistry.close();
    await this._coreDatabase.close();
  }

  @synchronized
  async setSpaceRoot(rootUrl: string): Promise<void> {
    log('setSpaceRoot', { rootUrl });
    const firstTime = this._rootUrl === undefined;
    this._rootUrl = rootUrl;
    if (this._lifecycleState === LifecycleState.OPEN) {
      if (firstTime) {
        await this._coreDatabase.open({ rootUrl });
      } else {
        await this._coreDatabase.updateSpaceState({ rootUrl });
      }
    }
  }

  // TODO(burdon): Type check.
  getObjectById<T extends Entity.Unknown = Entity.Any>(id: string, { deleted = false } = {}): T | undefined {
    const core = this._coreDatabase.getObjectCoreById(id);
    if (!core || (core.isDeleted() && !deleted)) {
      return undefined;
    }

    return defaultMap(this._rootProxies, core, () => initEchoReactiveObjectRootProxy(core, this));
  }

  makeRef<T extends AnyProperties = any>(dxn: DXN): Ref.Ref<T> {
    const ref = Ref.fromDXN(dxn);
    setRefResolver(ref, this.graph.createRefResolver({ context: { space: this.spaceId } }));
    return ref;
  }

  // Odd way to define methods types from a typedef.
  declare query: Database.QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(query: Query.Any | Filter.Any, options?: Database.QueryOptions & QueryAST.QueryOptions) {
    query = Filter.is(query) ? Query.select(query) : query;
    return this._coreDatabase.graph.query(query, {
      ...options,
      spaceIds: [this.spaceId],
    });
  }

  /**
   * Update objects.
   * @deprecated Mutate the object directly
   */
  async update(_filter: Filter.Any, _operation: unknown): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * @deprecated Use `db.add`.
   */
  async insert(_data: unknown): Promise<never> {
    throw new Error('Not implemented');
  }

  /**
   * Add reactive object.
   */
  add<T extends Entity.Unknown = Entity.Unknown>(obj: T, opts?: Database.AddOptions): T {
    if (!isEchoObject(obj)) {
      const schema = Obj.getSchema(obj);
      if (schema != null) {
        if (!this.schemaRegistry.hasSchema(schema) && !this.graph.schemaRegistry.hasSchema(schema)) {
          throw createSchemaNotRegisteredError(schema);
        }
      }

      obj = createObject(obj);
    }
    assertObjectModel(obj);

    // TODO(burdon): Check if already added to db?
    invariant(isEchoObject(obj));
    this._rootProxies.set(getObjectCore(obj), obj);

    const target = getProxyTarget(obj) as ProxyTarget & Entity.Unknown;
    EchoReactiveHandler.instance.setDatabase(target, this);
    EchoReactiveHandler.instance.saveRefs(target);
    this._coreDatabase.addCore(getObjectCore(obj), opts);
    return obj;
  }

  /**
   * Remove reactive object.
   */
  remove<T extends Entity.Unknown = Entity.Unknown>(obj: T): void {
    invariant(isEchoObject(obj));
    return this._coreDatabase.removeCore(getObjectCore(obj));
  }

  async flush(opts?: Database.FlushOptions): Promise<void> {
    await this._coreDatabase.flush(opts);
  }

  async runMigrations(migrations: ObjectMigration[]): Promise<void> {
    for (const migration of migrations) {
      const objects = await this._coreDatabase.graph.query(Query.select(Filter.typeDXN(migration.fromType))).run();
      log.verbose('migrate', {
        from: migration.fromType,
        to: migration.toType,
        objects: objects.length,
      });
      for (const object of objects) {
        const output = await migration.transform(object, { db: this });

        // TODO(dmaretskyi): Output validation.
        delete (output as any).id;

        await this._coreDatabase.atomicReplaceObject(object.id, {
          data: output,
          type: migration.toType,
        });
        const postMigrationType = Obj.getTypeDXN(object);
        invariant(postMigrationType != null && DXN.equals(postMigrationType, migration.toType));

        await migration.onMigration({ before: object, object, db: this });
      }
    }
    await this.flush();
  }

  getSyncState(): Promise<SpaceSyncState> {
    return this._coreDatabase.getSyncState();
  }

  subscribeToSyncState(ctx: Context, callback: (state: SpaceSyncState) => void): CleanupFn {
    return this._coreDatabase.subscribeToSyncState(ctx, callback);
  }

  /**
   * @internal
   */
  async _loadObjectById(objectId: string, options: LoadObjectOptions = {}): Promise<Obj.Any | undefined> {
    const core = await this._coreDatabase.loadObjectCoreById(objectId, options);
    if (!core || core?.isDeleted()) {
      return undefined;
    }

    const obj = defaultMap(this._rootProxies, core, () => initEchoReactiveObjectRootProxy(core, this));
    invariant(isLiveObject(obj));
    return obj;
  }

  //
  // Deprecated API.
  //

  /**
   * @deprecated
   */
  readonly pendingBatch = new Event<unknown>();

  /**
   * @deprecated
   */
  get coreDatabase(): CoreDatabase {
    return this._coreDatabase;
  }
}

// TODO(burdon): Create APIError class.
const createSchemaNotRegisteredError = (schema?: any) => {
  const message = 'Schema not registered';
  if (schema?.typename) {
    return new Error(`${message} Schema: ${schema.typename}`);
  }

  return new Error(message);
};
