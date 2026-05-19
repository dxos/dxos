//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type CleanupFn, Event, type ReadOnlyEvent, synchronized } from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { inspectObject } from '@dxos/debug';
import { Database, type Entity, Filter, JsonSchema, Obj, Query, QueryAST, Ref, type SchemaRegistry, Type } from '@dxos/echo';
import { runSyncAndForwardErrors } from '@dxos/effect';
import {
  type AnyProperties,
  MetaId,
  type ObjectMeta,
  PersistentSchema,
  TypeAnnotationId,
  TypeIdentifierAnnotationId,
  assertObjectModel,
  createObject as createPersistentObject,
  getTypeAnnotation,
  makeTypeJsonSchemaAnnotation,
  setRefResolver,
} from '@dxos/echo/internal';
import { getProxyTarget, isProxy } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId, type URI } from '@dxos/keys';
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
  get graph(): HypergraphImpl;

  /**
   * @internal
   * Called by echo-handler when a PersistentSchema object is encountered during deserialization.
   */
  _getOrRegisterPersistentSchema(schema: PersistentSchema): Type.RuntimeType;

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
   * Run a reactive query for dynamic schemas.
   * @default true
   */
  reactiveSchemaQuery?: boolean;

  /**
   * Preload all schemas during open.
   * @default true
   */
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

  /**
   * Mapping `object core` -> `root proxy` (User facing proxies).
   * @internal
   */
  readonly _rootProxies = new Map<ObjectCore, Entity.Unknown>();

  readonly saveStateChanged: ReadOnlyEvent<SaveStateChangedEvent>;

  private _rootUrl: string | undefined = undefined;
  private readonly _reactiveSchemaQuery: boolean;
  private readonly _preloadSchemaOnOpen: boolean;
  private readonly _registeredPersistentSchemaIds = new Set<string>();

  constructor(params: EchoDatabaseProps) {
    super();

    this._reactiveSchemaQuery = params.reactiveSchemaQuery ?? true;
    this._preloadSchemaOnOpen = params.preloadSchemaOnOpen ?? true;

    this._coreDatabase = new CoreDatabase({
      graph: params.graph,
      dataService: params.dataService,
      queryService: params.queryService,
      spaceId: params.spaceId,
      spaceKey: params.spaceKey,
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

  @synchronized
  protected override async _open(): Promise<void> {
    if (this._rootUrl !== undefined) {
      await this._coreDatabase.open(this._ctx, { rootUrl: this._rootUrl });
    }

    if (this._preloadSchemaOnOpen) {
      const schemas = await this.query(Filter.type(PersistentSchema)).run();
      schemas.forEach((schema) => this._registerPersistentSchema(schema));
    }

    if (this._reactiveSchemaQuery) {
      const unsubscribe = this.query(Filter.type(PersistentSchema)).subscribe((query) => {
        const newSchemas = query.results.filter((schema) => !this._registeredPersistentSchemaIds.has(schema.id));
        newSchemas.forEach((schema) => this._registerPersistentSchema(schema));
      });
      this._ctx.onDispose(unsubscribe);
    }
  }

  @synchronized
  protected override async _close(): Promise<void> {
    await this._coreDatabase.close();
  }

  /**
   * Register one or more schemas into the database.
   * Creates a PersistentSchema ECHO object for each and adds it to the space.
   */
  async register(inputs: SchemaRegistry.RegisterSchemaInput[]): Promise<Type.RuntimeType[]> {
    const results: Type.RuntimeType[] = [];
    for (const input of inputs) {
      if (Schema.isSchema(input)) {
        results.push(this._addPersistentSchema(input));
      } else if (typeof input === 'object' && 'typename' in input && 'version' in input && 'jsonSchema' in input) {
        const schema = this._addPersistentSchema(
          JsonSchema.toEffectSchema({
            ...input.jsonSchema,
            typename: input.typename,
            version: input.version,
          }),
        );
        results.push(schema);
        if (input.name) {
          Obj.update(schema.persistentSchema, (ps) => {
            ps.name = input.name;
          });
        }
      } else {
        throw new TypeError('Invalid schema');
      }
    }
    return results;
  }

  /**
   * @internal
   * Called by echo-handler when a PersistentSchema object is encountered during deserialization.
   */
  _getOrRegisterPersistentSchema(schema: PersistentSchema): Type.RuntimeType {
    const identifierDXN = `dxn:echo:@:${schema.id}`;
    const existing = runSyncAndForwardErrors(this.graph.registry.getTypeByDXN(identifierDXN));
    if (existing instanceof Type.RuntimeType) {
      return existing;
    }
    this._registerPersistentSchema(schema);
    return runSyncAndForwardErrors(this.graph.registry.getTypeByDXN(identifierDXN)) as Type.RuntimeType;
  }

  private _registerPersistentSchema(schema: PersistentSchema): void {
    if (this._registeredPersistentSchemaIds.has(schema.id)) {
      return;
    }
    this._registeredPersistentSchemaIds.add(schema.id);
    const runtimeType = new Type.RuntimeType(schema);
    this._ctx.onDispose(
      getObjectCore(schema).updates.on(() => {
        runtimeType._invalidate();
        this.graph.registry.touch();
      }),
    );
    this.graph.registry.addTypes([runtimeType]);
  }

  private _addPersistentSchema(schemaInput: Schema.Schema.AnyNoContext): Type.RuntimeType {
    let schema = schemaInput;
    if (schema instanceof Type.RuntimeType) {
      schema = schema.snapshot.annotations({ [TypeIdentifierAnnotationId]: undefined });
    }

    const meta = getTypeAnnotation(schema);
    invariant(meta, 'use Schema.Struct({}).pipe(Type.Obj()) or class syntax to create a valid schema');
    const schemaToStore = createPersistentObject(PersistentSchema, {
      ...meta,
      jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({})),
    });
    const typeId = `dxn:echo:@:${schemaToStore.id}`;
    schemaToStore.jsonSchema = JsonSchema.toJsonSchema(
      schema.annotations({
        [TypeAnnotationId]: meta,
        [TypeIdentifierAnnotationId]: typeId,
        [SchemaAST.JSONSchemaAnnotationId]: makeTypeJsonSchemaAnnotation({
          identifier: typeId,
          kind: meta.kind,
          typename: meta.typename,
          version: meta.version,
        }),
      }),
    );

    const persistentSchema = this.add(schemaToStore);
    this._registerPersistentSchema(persistentSchema);
    const result = runSyncAndForwardErrors(this.graph.registry.getTypeByDXN(typeId)) as Type.RuntimeType;
    invariant(result instanceof Type.RuntimeType);
    result._rebuild();
    return result;
  }

  @synchronized
  async setSpaceRoot(rootUrl: string): Promise<void> {
    log('setSpaceRoot', { rootUrl });
    const firstTime = this._rootUrl === undefined;
    this._rootUrl = rootUrl;
    if (this._lifecycleState === LifecycleState.OPEN) {
      if (firstTime) {
        await this._coreDatabase.open(this._ctx, { rootUrl });
      } else {
        await this._coreDatabase.updateSpaceState(this._ctx, { rootUrl });
      }
    }
  }

  // TODO(burdon): Type check.
  getObjectById<T extends Entity.Unknown = Entity.Any>(id: string, { deleted = false } = {}): T | undefined {
    const core = this._coreDatabase.getObjectCoreById(id);
    if (!core || (core.isDeleted() && !deleted)) {
      return undefined;
    }

    return defaultMap(this._rootProxies, core, () => initEchoReactiveObjectRootProxy(core, this)) as T;
  }

  makeRef<T extends AnyProperties = any>(uri: URI.URI): Ref.Ref<T> {
    const ref = Ref.fromURI(uri);
    setRefResolver(ref, this.graph.createRefResolver({ context: { space: this.spaceId } }));
    return ref;
  }

  // Odd way to define methods types from a typedef.
  declare query: Database.QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(query: Query.Any | Filter.Any) {
    query = Filter.is(query) ? Query.select(query) : query;

    if (!isQueryScoped(query.ast)) {
      query = query.from(this);
    }

    return this._coreDatabase.graph.query(query);
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
      const schema = Obj.getSchema(obj as unknown as Obj.Unknown);
      if (schema != null) {
        const typename = Type.getTypename(schema as any);
        const version = Type.getVersion(schema as any);
        const identifierDXN = Type.getDXN(schema as any);
        const inRegistry =
          typename && version
            ? runSyncAndForwardErrors(this.graph.registry.getTypeByDXN(`dxn:type:${typename}:${version}`)) !== undefined ||
              (identifierDXN != null && runSyncAndForwardErrors(this.graph.registry.getTypeByDXN(identifierDXN.toString())) !== undefined)
            : false;
        if (!inRegistry) {
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
      const objects = await this._coreDatabase.graph
        .query(Query.select(Filter.typeURI(migration.fromType)).from(this))
        .run();
      log.verbose('migrate', {
        from: migration.fromType,
        to: migration.toType,
        objects: objects.length,
      });
      for (const object of objects) {
        // Snapshot the pre-migration state so optional `onMigration` callbacks can read legacy fields.
        // After `atomicReplaceObject` the `object` proxy reflects the new shape, so this snapshot
        // is the only way for callers to access the original `From` data.
        const before = JSON.parse(JSON.stringify(object));

        const output = (await migration.transform(object, { db: this })) as any;
        const metaPatch = output?.[MetaId] as Partial<ObjectMeta> | undefined;
        if (metaPatch !== undefined && output != null) {
          delete output[MetaId];
        }

        // TODO(dmaretskyi): Output validation.
        delete (output as any).id;

        await this._coreDatabase.atomicReplaceObject(object.id, {
          data: output,
          type: migration.toType,
          meta: metaPatch as any,
        });
        const postMigrationType = Obj.getTypeURI(object);
        invariant(postMigrationType != null && postMigrationType.toString() === migration.toType.toString());

        if (migration.onMigration) {
          await migration.onMigration({ before, object, db: this });
        }
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
   * Update service references after reconnection.
   */
  _updateServices({ dataService, queryService }: { dataService: DataService; queryService: QueryService }): void {
    this._coreDatabase._updateServices({ dataService, queryService });
  }

  /**
   * Handle reconnection to re-establish RPC streams.
   */
  async _onReconnect(): Promise<void> {
    await this._coreDatabase._onReconnect();
  }

  /**
   * @internal
   */
  async _loadObjectById(objectId: string, options: LoadObjectOptions = {}): Promise<Entity.Unknown | undefined> {
    const core = await this._coreDatabase.loadObjectCoreById(objectId, options);
    if (!core || (core?.isDeleted() && !options.allowDeleted)) {
      return undefined;
    }

    const obj = defaultMap(this._rootProxies, core, () => initEchoReactiveObjectRootProxy(core, this));
    invariant(isProxy(obj));
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
  // `typename` on a persisted `Type.Type` entity is no longer a direct field —
  // it lives in `ObjectMeta.key`. Read it through the helper so this error
  // path keeps surfacing a typename for both schema flavours (static
  // `Type.Obj` constants, where `.typename` is a real field, and persisted
  // entities, where it isn't).
  if (schema != null) {
    try {
      const typename = Type.getTypename(schema);
      return new Error(`${message} Schema: ${typename}`);
    } catch {
      // fall through to plain error
    }
  }
  return new Error(message);
};

const isQueryScoped = (query: QueryAST.Query): boolean => {
  let scoped = false;
  QueryAST.visit(query, (node) => {
    if (node.type === 'from') {
      scoped = true;
    }
  });
  return scoped;
};
