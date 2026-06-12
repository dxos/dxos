//
// Copyright 2022 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { inspect } from 'node:util';

import { type CleanupFn, Event, type ReadOnlyEvent, synchronized } from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { inspectObject } from '@dxos/debug';
import { Database, Entity, Filter, JsonSchema, Obj, Query, QueryAST, Ref, type Registry, Type } from '@dxos/echo';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import {
  type AnyProperties,
  EntityKind,
  MetaId,
  type EntityMeta,
  TypeSchema as PersistentSchema,
  type TypeAnnotation,
  TypeAnnotationId,
  TypeIdentifierAnnotationId,
  assertObjectModel,
  createObject as createPersistentObject,
  getTypeAnnotation,
  makeTypeJsonSchemaAnnotation,
  setRefResolver,
} from '@dxos/echo/internal';
import { getProxyTarget, isProxy } from '@dxos/echo/internal';
import { assertArgument, invariant } from '@dxos/invariant';
import { EID, EntityId, type PublicKey, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { type QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import { type DataService, type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { defaultMap } from '@dxos/util';

import type { SaveStateChangedEvent } from '../automerge';
import { type DocHandleProxy, type RepoProxy } from '../automerge';
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
  get spaceKey(): PublicKey;

  // Overrides interface.
  get graph(): HypergraphImpl;

  /**
   * @internal
   * Called by echo-handler when a PersistentSchema object is encountered during deserialization.
   */
  _getOrRegisterPersistentSchema(schema: PersistentSchema): Type.AnyEntity;

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
   * Returns ids for all objects in the space (both loaded and unloaded).
   */
  getAllObjectIds(): string[];

  /**
   * Returns the number of objects stored inline in the space root document.
   */
  getNumberOfInlineObjects(): number;

  /**
   * Fires when the space root document changes.
   */
  readonly rootChanged: ReadOnlyEvent<void>;

  /**
   * Returns the loaded automerge document handles.
   */
  getLoadedDocumentHandles(): DocHandleProxy<any>[];

  /**
   * Migration-scoped accessor to the automerge repo.
   * Will be moved to a dedicated internal entrypoint in a future stage.
   */
  readonly _repo: RepoProxy;

  /**
   * Returns the space root document handle for migration tools.
   * Will be moved to a dedicated internal entrypoint in a future stage.
   */
  _getSpaceRootDocHandle(): DocHandleProxy<DatabaseDirectory>;

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
 * User-facing API for the space database.
 * Implements EchoDatabase interface.
 */
export class DatabaseImpl extends Resource implements EchoDatabase {
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

  // `db.registry` is literally the shared hypergraph registry — queries with a
  // registry target pull from it directly. Getter (not eager field) so it resolves
  // lazily after graph initialisation.
  get registry(): Registry.Registry {
    return this.graph.registry;
  }

  @synchronized
  protected override async _open(): Promise<void> {
    if (this._rootUrl !== undefined) {
      await this._coreDatabase.open(this._ctx, { rootUrl: this._rootUrl });
    }

    if (this._preloadSchemaOnOpen) {
      // Eager-load persisted schema cores so synchronous schema resolution
      // (echo-handler getSchema/getTypeEntity → getObjectById) succeeds for objects
      // loaded at open. Persisted schemas live in the db only; they are never added to
      // the shared graph registry (which holds runtime/static type entities) to avoid
      // leaking types across spaces.
      await this.query(Filter.type(PersistentSchema)).run();
    }

    if (this._reactiveSchemaQuery) {
      // Keep persisted schema cores loaded as they are added or replicated after open,
      // so synchronous schema resolution continues to succeed.
      const unsubscribe = this.query(Filter.type(PersistentSchema)).subscribe(() => {});
      this._ctx.onDispose(unsubscribe);
    }
  }

  @synchronized
  protected override async _close(): Promise<void> {
    await this._coreDatabase.close();
  }

  /**
   * @internal
   * Called by echo-handler when a PersistentSchema object is encountered during deserialization.
   * A persisted schema materializes directly as its `Type.AnyEntity` (kind=type), so the
   * object is returned as-is. Persisted schemas live in the db only and are never added to
   * the shared graph registry, which would leak types across spaces.
   */
  _getOrRegisterPersistentSchema(schema: PersistentSchema): Type.AnyEntity {
    // A persisted object matching `Filter.type(TypeSchema)` by its `@type` but materializing
    // as kind=object (e.g. data in a pre-Type-entity format) must fail loudly here rather than
    // deep inside a consumer that assumes `Type.getSchema()` is safe.
    invariant(
      Type.isType(schema),
      'persisted schema must materialize as a Type entity (kind=type); data may be in a legacy format',
    );
    return schema;
  }

  private _addPersistentSchema(schemaInput: Schema.Schema.AnyNoContext | Type.AnyEntity): Type.AnyEntity {
    let schema: Schema.Schema.AnyNoContext;
    let meta: TypeAnnotation | undefined;
    if (Type.isType(schemaInput)) {
      const entity = schemaInput;
      schema = Type.getSchema(entity).annotations({ [TypeIdentifierAnnotationId]: undefined });
      // Prefer the annotation embedded in the schema; fall back to the entity's
      // EntityMeta-derived accessors for entities built via `makeObjectFromJsonSchema`
      // (whose `jsonSchema` carries no `TypeAnnotation`).
      meta =
        getTypeAnnotation(schema) ??
        ({
          kind: Type.isRelation(entity) ? EntityKind.Relation : EntityKind.Object,
          typename: Type.getTypename(entity),
          version: Type.getVersion(entity),
        } satisfies TypeAnnotation);
    } else {
      schema = schemaInput;
      meta = getTypeAnnotation(schema);
    }
    invariant(meta, 'use Schema.Struct({}).pipe(Type.Obj()) or class syntax to create a valid schema');
    // Create a TypeSchema entity using the internal createObject utility.
    // We pass typename/version via EntityMeta (MetaId) since TypeSchema no longer
    // has them as own data fields.
    const schemaToStore = createPersistentObject(PersistentSchema, {
      [MetaId]: { keys: [], key: meta.typename, version: meta.version },
      jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({})),
    });
    const typeId = EID.make({ entityId: EntityId.make(schemaToStore.id) });
    // Update jsonSchema with the full annotated schema.
    // TypeSchema.jsonSchema is readonly in the type but writable via change context.
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

    const persistentSchema = this._addObject(schemaToStore);
    invariant(Type.isType(persistentSchema), 'persisted schema must materialize as a Type entity (kind=type)');
    return persistentSchema;
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
  /** @deprecated Use `db.query(Filter.id(id)).runSync()[0]` for a working-set lookup, or resolve via a {@link Ref}. */
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
      // Default to the owning space only. The in-process registry is opt-in:
      // callers add `Scope.registry()` (e.g. `.from(Scope.space(), Scope.registry())`)
      // when they want to fan a query into code-shipped types/objects too.
      query = query.from(this);
    } else {
      // An explicit `Scope.space()` with no spaceId targets the owning space. Bind it to
      // this database's spaceId here (the only place the owning space is known) so it does
      // not fan across every space in the hypergraph — e.g. `.from(Scope.space(), Scope.registry())`.
      query = Query.fromAst(bindOwningSpaceScopes(query.ast, this.spaceId));
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
   * Add a reactive object or relation.
   *
   * Type definitions are not accepted here — use {@link addType}, which clones the entity and
   * checks for an existing type with the same typename/version before persisting.
   */
  add<T extends Entity.Unknown = Entity.Unknown>(obj: T, opts?: Database.AddOptions): T {
    invariant(!Type.isType(obj), 'use db.addType() to persist Type entities');
    return this._addObject(obj, opts);
  }

  /**
   * Persist a Type definition (clones/forks the entity) so it replicates to other peers.
   *
   * Queries the space first: if a type with the same typename + version is already persisted,
   * the existing entity is returned and no duplicate is created (idempotent). This is the only
   * supported way to add Type entities — {@link add} rejects them.
   */
  async addType<T extends Type.AnyEntity>(type: T): Promise<T> {
    invariant(Type.isType(type), 'addType expects a Type entity');
    const typename = Type.getTypename(type);
    // Compare the canonical (head-free) EntityMeta version on both sides — `Type.getVersion`
    // appends automerge heads for db-attached entities and would never match a fresh draft.
    const version = Type.getMeta(type).version ?? Type.getVersion(type);

    // Space-scoped by default (the in-process registry is opt-in via `Scope.registry()`), so this
    // sees only types persisted in this space — exactly what `_open()` reloads.
    const existing = await this.query(Filter.type(Type.Type)).run();
    const match = existing.find(
      (candidate) =>
        Type.getTypename(candidate) === typename &&
        (Type.getMeta(candidate).version ?? Type.getVersion(candidate)) === version,
    );
    if (match) {
      return match as unknown as T;
    }

    return this._addPersistentSchema(type) as unknown as T;
  }

  private _addObject<T extends Entity.Unknown = Entity.Unknown>(obj: T, opts?: Database.AddOptions): T {
    if (!isEchoObject(obj)) {
      const typeEntity = Entity.getType(obj);
      if (typeEntity != null) {
        // A persisted (database-attached) type is valid by virtue of living in a database;
        // its schema resolves through the db rather than the shared registry. A static/runtime
        // type must be present in the shared registry.
        const isPersisted = Type.getDatabase(typeEntity) != null;
        if (!isPersisted) {
          const typename = Type.getTypename(typeEntity);
          const version = Type.getVersion(typeEntity);
          const registered =
            typename && version ? this.graph.registry.getByURI(`dxn:${typename}:${version}`) : undefined;
          const inRegistry = registered != null && Type.isType(registered);
          if (!inRegistry) {
            throw createSchemaNotRegisteredError(typeEntity);
          }
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
    assertArgument(isEchoObject(obj), 'obj');
    return this._coreDatabase.removeCore(getObjectCore(obj));
  }

  async flush(opts?: Database.FlushOptions): Promise<void> {
    await this._coreDatabase.flush(opts);
  }

  async runMigrations(migrations: ObjectMigration[]): Promise<void> {
    for (const migration of migrations) {
      const objects = await this._coreDatabase.graph
        .query(Query.select(Filter.type(migration.fromType)).from(this))
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
        const metaPatch = output?.[MetaId] as Partial<EntityMeta> | undefined;
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

  getAllObjectIds(): string[] {
    return this._coreDatabase.getAllObjectIds();
  }

  getNumberOfInlineObjects(): number {
    return this._coreDatabase.getNumberOfInlineObjects();
  }

  get rootChanged(): ReadOnlyEvent<void> {
    return this._coreDatabase.rootChanged;
  }

  getLoadedDocumentHandles(): DocHandleProxy<any>[] {
    return this._coreDatabase.getLoadedDocumentHandles();
  }

  get _repo(): RepoProxy {
    return this._coreDatabase._repo;
  }

  _getSpaceRootDocHandle(): DocHandleProxy<DatabaseDirectory> {
    return this._coreDatabase._automergeDocLoader.getSpaceRootDocHandle();
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
   * Direct access to the core database layer. Only valid within @dxos/echo-client; external consumers
   * must use the named API methods (getAllObjectIds, getNumberOfInlineObjects, rootChanged, etc.).
   */
  get coreDatabase(): CoreDatabase {
    return this._coreDatabase;
  }
}

// TODO(burdon): Create APIError class.
const createSchemaNotRegisteredError = (schema?: any) => {
  const message = 'Schema not registered';
  // `typename` on a persisted `Type.Type` entity is no longer a direct field —
  // it lives in `EntityMeta.key`. Read it through the helper so this error
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

/**
 * Binds every space scope without an explicit `spaceId` to the owning database's space.
 * `Scope.space()` means "the owning space"; without binding it here it would fan across
 * every space source in the hypergraph query context.
 */
const bindOwningSpaceScopes = (ast: QueryAST.Query, spaceId: SpaceId): QueryAST.Query => {
  const transform = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(transform);
    }
    if (value !== null && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (record._tag === 'space' && record.spaceId === undefined) {
        return { ...record, spaceId };
      }
      return Object.fromEntries(Object.entries(record).map(([key, child]) => [key, transform(child)]));
    }
    return value;
  };
  return transform(ast) as QueryAST.Query;
};
