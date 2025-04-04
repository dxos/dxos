//
// Copyright 2022 DXOS.org
//

import { Event, type ReadOnlyEvent, synchronized } from '@dxos/async';
import { LifecycleState, Resource } from '@dxos/context';
import { type AnyObjectData, type BaseObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN, type PublicKey, type SpaceId } from '@dxos/keys';
import { type ReactiveObject, getProxyTarget, getSchema, getType, isReactiveObject } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import { type DataService } from '@dxos/protocols/proto/dxos/echo/service';
import { defaultMap } from '@dxos/util';

import { EchoSchemaRegistry } from './echo-schema-registry';
import type { ObjectMigration } from './object-migration';
import {
  CoreDatabase,
  type FlushOptions,
  type LoadObjectOptions,
  type ObjectCore,
  type ObjectPlacement,
} from '../core-db';
import type { InsertBatch, InsertData, UpdateOperation } from '../core-db/crud-api';
import {
  EchoReactiveHandler,
  type ProxyTarget,
  type ReactiveEchoObject,
  createObject,
  getObjectCore,
  initEchoReactiveObjectRootProxy,
  isEchoObject,
} from '../echo-handler';
import { type Hypergraph } from '../hypergraph';
import { Filter, type FilterSource, type PropertyFilter, type QueryFn, type QueryOptions } from '../query';

export type GetObjectByIdOptions = {
  deleted?: boolean;
};

export type AddOptions = {
  /**
   * Where to place the object in the Automerge document tree.
   * Root document is always loaded with the space.
   * Linked documents are loaded lazily.
   * Placing large number of objects in the root document may slow down the initial load.
   *
   * @default 'linked-doc'
   */
  placeIn?: ObjectPlacement;
};

/**
 *
 */
// TODO(burdon): Document.
// TODO(burdon): Rename DatabaseProxy.
export interface EchoDatabase {
  get spaceKey(): PublicKey;

  get spaceId(): SpaceId;

  get schemaRegistry(): EchoSchemaRegistry;

  get graph(): Hypergraph;

  getObjectById<T extends BaseObject = any>(id: string, opts?: GetObjectByIdOptions): ReactiveEchoObject<T> | undefined;

  /**
   * Query objects.
   */
  query: QueryFn;

  /**
   * Update objects.
   */
  update(filter: PropertyFilter, operation: UpdateOperation): Promise<void>;

  /**
   * Insert new objects.
   */
  // TODO(dmaretskyi): Support meta.
  insert(data: InsertData): Promise<AnyObjectData>;
  insert(data: InsertBatch): Promise<AnyObjectData[]>;

  /**
   * Adds object to the database.
   */
  add<T extends BaseObject>(obj: ReactiveObject<T>, opts?: AddOptions): ReactiveEchoObject<T>;

  /**
   * Removes object from the database.
   */
  remove<T extends ReactiveEchoObject<any>>(obj: T): void;

  /**
   * Wait for all pending changes to be saved to disk.
   */
  flush(opts?: FlushOptions): Promise<void>;

  /**
   * Run migrations.
   */
  runMigrations(migrations: ObjectMigration[]): Promise<void>;

  /**
   * @deprecated
   */
  readonly pendingBatch: ReadOnlyEvent<unknown>;

  /**
   * @deprecated
   */
  readonly coreDatabase: CoreDatabase;
}

export type EchoDatabaseParams = {
  graph: Hypergraph;
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
  private readonly _schemaRegistry: EchoSchemaRegistry;
  /**
   * @internal
   */
  _coreDatabase: CoreDatabase;

  private _rootUrl: string | undefined = undefined;

  /**
   * Mapping `object core` -> `root proxy` (User facing proxies).
   * @internal
   */
  readonly _rootProxies = new Map<ObjectCore, ReactiveEchoObject<any>>();

  constructor(params: EchoDatabaseParams) {
    super();

    this._coreDatabase = new CoreDatabase({
      graph: params.graph,
      dataService: params.dataService,
      queryService: params.queryService,
      spaceId: params.spaceId,
      spaceKey: params.spaceKey,
    });

    this._schemaRegistry = new EchoSchemaRegistry(this, {
      reactiveQuery: params.reactiveSchemaQuery,
      preloadSchemaOnOpen: params.preloadSchemaOnOpen,
    });
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

  get graph(): Hypergraph {
    return this._coreDatabase.graph;
  }

  // TODO(burdon): Rename.
  get schemaRegistry(): EchoSchemaRegistry {
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
  async setSpaceRoot(rootUrl: string) {
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

  getObjectById(id: string, { deleted = false } = {}): ReactiveEchoObject<any> | undefined {
    const core = this._coreDatabase.getObjectCoreById(id);
    if (!core || (core.isDeleted() && !deleted)) {
      return undefined;
    }

    const object = defaultMap(this._rootProxies, core, () => initEchoReactiveObjectRootProxy(core, this));
    invariant(isReactiveObject(object));
    return object;
  }

  // Odd way to define methods types from a typedef.
  declare query: QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(filter?: FilterSource, options?: QueryOptions) {
    return this._coreDatabase.graph.query(filter, {
      ...options,
      spaceIds: [this.spaceId],
      spaces: [this.spaceKey],
    });
  }

  /**
   * Update objects.
   */
  async update(filter: PropertyFilter, operation: UpdateOperation) {
    await this._coreDatabase.update(filter, operation);
  }

  // TODO(dmaretskyi): Support meta.
  async insert(data: InsertData): Promise<AnyObjectData>;
  async insert(data: InsertBatch): Promise<AnyObjectData[]>;
  async insert(data: InsertData | InsertBatch): Promise<AnyObjectData | AnyObjectData[]> {
    return this._coreDatabase.insert(data);
  }

  /**
   * Add reactive object.
   */
  add<T extends ReactiveObject<T>>(obj: T, opts?: AddOptions): ReactiveEchoObject<T> {
    if (!isEchoObject(obj)) {
      const schema = getSchema(obj);
      if (schema != null) {
        if (!this.schemaRegistry.hasSchema(schema) && !this.graph.schemaRegistry.hasSchema(schema)) {
          throw createSchemaNotRegisteredError(schema);
        }
      }

      obj = createObject(obj);
    }

    // TODO(burdon): Check if already added to db?
    invariant(isEchoObject(obj));
    this._rootProxies.set(getObjectCore(obj), obj);

    const target = getProxyTarget(obj) as ProxyTarget;
    EchoReactiveHandler.instance.setDatabase(target, this);
    EchoReactiveHandler.instance.saveRefs(target);
    this._coreDatabase.addCore(getObjectCore(obj), opts);

    return obj;
  }

  /**
   * Remove reactive object.
   */
  remove<T extends ReactiveEchoObject<T>>(obj: T): void {
    invariant(isEchoObject(obj));
    return this._coreDatabase.removeCore(getObjectCore(obj));
  }

  async flush(opts?: FlushOptions): Promise<void> {
    await this._coreDatabase.flush(opts);
  }

  async runMigrations(migrations: ObjectMigration[]): Promise<void> {
    for (const migration of migrations) {
      const { objects } = await this._coreDatabase.graph.query(Filter.typeDXN(migration.fromType.toString())).run();
      log.verbose('migrate', { from: migration.fromType, to: migration.toType, objects: objects.length });
      for (const object of objects) {
        const output = await migration.transform(object, { db: this });

        // TODO(dmaretskyi): Output validation.
        delete (output as any).id;

        await this._coreDatabase.atomicReplaceObject(object.id, {
          data: output,
          type: migration.toType,
        });
        const postMigrationType = getType(object)?.toDXN();
        invariant(postMigrationType != null && DXN.equals(postMigrationType, migration.toType));

        await migration.onMigration({ before: object, object, db: this });
      }
    }
    await this.flush();
  }

  /**
   * @internal
   */
  async _loadObjectById<T extends BaseObject>(
    objectId: string,
    options: LoadObjectOptions = {},
  ): Promise<ReactiveEchoObject<T> | undefined> {
    const core = await this._coreDatabase.loadObjectCoreById(objectId, options);
    if (!core || core?.isDeleted()) {
      return undefined;
    }

    const obj = defaultMap(this._rootProxies, core, () => initEchoReactiveObjectRootProxy(core, this));
    invariant(isReactiveObject(obj));
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
