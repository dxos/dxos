//
// Copyright 2022 DXOS.org
//

import { next as A, getHeads } from '@automerge/automerge';
import { type AutomergeUrl, type DocumentId, interpretAsDocumentId } from '@automerge/automerge-repo';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { inspect } from 'node:util';

import {
  type CleanupFn,
  Event,
  type ReadOnlyEvent,
  TimeoutError,
  Trigger,
  UpdateScheduler,
  asyncTimeout,
  runInContextAsync,
  synchronized,
} from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { cancelWithContext, Context, ContextDisposedError, LifecycleState, Resource } from '@dxos/context';
import { inspectObject, raise, warnAfterTimeout } from '@dxos/debug';
import { Database, Entity, Filter, JsonSchema, Obj, Query, QueryAST, Ref, type Registry, Type } from '@dxos/echo';
import {
  DatabaseDirectory,
  EncodedReference,
  type EntityStructure,
  SpaceDocVersion,
  type SpaceState,
} from '@dxos/echo-protocol';
import { batchEvents } from '@dxos/echo/internal';
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
import { assertArgument, assertState, invariant } from '@dxos/invariant';
import { EID, type EntityId, type PublicKey, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError } from '@dxos/protocols';
import type { QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import type { DataService, SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { chunkArray, ComplexSet, deepMapValues, defaultMap } from '@dxos/util';

import { type ChangeEvent, type DocHandleProxy, RepoProxy, type SaveStateChangedEvent } from '../automerge';
import {
  type AddCoreOptions,
  type AtomicReplaceObjectProps,
  type DocumentChanges,
  type GetObjectCoreByIdOptions,
  type IDatabaseBinding,
  type ItemsUpdatedEvent,
  type LoadObjectDocumentOptions,
  type LoadObjectOptions,
  ObjectCore,
  type SpaceDocumentHeads,
} from '../core-db';
import { getInlineAndLinkChanges } from '../core-db/util';
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
 * Maximum number of remote update notifications per second.
 */
const THROTTLED_UPDATE_FREQUENCY = 10;

type SpaceDocumentLinks = DatabaseDirectory['links'];

/**
 * Payload for the internal object-document-loaded notification.
 */
interface ObjectDocumentLoaded {
  handle: DocHandleProxy<DatabaseDirectory>;
  objectId: string;
}

/**
 * Payload for the internal object-unavailable notification.
 */
interface ObjectUnavailable {
  handle?: DocHandleProxy<DatabaseDirectory>;
  objectId: string;
}

const TRACE_LOADING = false;

/**
 * User-facing API for the space database.
 * Implements EchoDatabase interface and owns all Automerge document management.
 */
@trace.resource()
export class DatabaseImpl extends Resource implements EchoDatabase, IDatabaseBinding {
  readonly [Database.TypeId]: typeof Database.TypeId = Database.TypeId;

  // ── Injected dependencies ───────────────────────────────────────────────
  private readonly _spaceKey: PublicKey;
  private readonly _spaceId: SpaceId;
  private readonly _hypergraph: HypergraphImpl;
  private _dataService: DataService;
  private _queryService: QueryService;
  private readonly _repoProxy: RepoProxy;

  // ── Object storage ──────────────────────────────────────────────────────
  private readonly _objects = new Map<string, ObjectCore>();

  /**
   * DXN string -> EntityId.
   * Tracks strong dependency relationships for ordered loading.
   */
  private readonly _strongDepsIndex = new Map<string, EntityId[]>();

  /**
   * Object ids whose backing document was determined to be not on local disk.
   */
  private readonly _unavailableObjects = new Set<EntityId>();

  // ── Events ──────────────────────────────────────────────────────────────
  readonly _updateEvent = new Event<ItemsUpdatedEvent>();
  readonly saveStateChanged: ReadOnlyEvent<SaveStateChangedEvent>;

  /** Fires when the database has finished loading its initial space root document. */
  readonly opened = new Trigger();

  /** Fires when service connection is re-established after a leader change. */
  private readonly _reconnected = new Event<void>();

  // ── Inlined doc-loader state ────────────────────────────────────────────

  private _spaceRootDocHandle: DocHandleProxy<DatabaseDirectory> | null = null;

  private readonly _objectDocumentHandles = new Map<string, DocHandleProxy<DatabaseDirectory>>();

  private readonly _objectsPendingDocumentLoad = new Map<string, LoadObjectDocumentOptions>();

  private readonly _currentlyLoadingObjects = new ComplexSet<{ url: AutomergeUrl; objectId: string }>(
    ({ url, objectId }) => `${url}:${objectId}`,
  );

  private readonly _pendingDocumentCreations = new Map<string, Promise<void>>();

  // ── Database options ────────────────────────────────────────────────────
  private _rootUrl: string | undefined = undefined;
  private readonly _reactiveSchemaQuery: boolean;
  private readonly _preloadSchemaOnOpen: boolean;

  constructor(params: EchoDatabaseProps) {
    super();

    this._spaceKey = params.spaceKey;
    this._spaceId = params.spaceId;
    this._hypergraph = params.graph;
    this._dataService = params.dataService;
    this._queryService = params.queryService;
    this._repoProxy = new RepoProxy(this._dataService, this._spaceId);
    this.saveStateChanged = this._repoProxy.saveStateChanged;

    this._reactiveSchemaQuery = params.reactiveSchemaQuery ?? true;
    this._preloadSchemaOnOpen = params.preloadSchemaOnOpen ?? true;
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return {
      id: this._spaceId,
      objects: this._objects.size,
    };
  }

  get spaceId(): SpaceId {
    return this._spaceId;
  }

  /** @deprecated Use spaceId. */
  get spaceKey(): PublicKey {
    return this._spaceKey;
  }

  get rootUrl(): string | undefined {
    return this._rootUrl;
  }

  get graph(): HypergraphImpl {
    return this._hypergraph;
  }

  get registry(): Registry.Registry {
    return this.graph.registry;
  }

  // ── Resource lifecycle ──────────────────────────────────────────────────

  @synchronized
  protected override async _open(): Promise<void> {
    this._updateScheduler = new UpdateScheduler(this._ctx, async () => this._emitDbUpdateEvents(this._ctx), {
      maxFrequency: THROTTLED_UPDATE_FREQUENCY,
    });

    await this._repoProxy.open();
    this._ctx.onDispose(() => this._unsubscribeFromHandles());

    if (this._rootUrl !== undefined) {
      await this._openWithSpaceState({ rootUrl: this._rootUrl });
    }

    if (this._preloadSchemaOnOpen) {
      await this.query(Filter.type(PersistentSchema)).run();
    }

    if (this._reactiveSchemaQuery) {
      const unsubscribe = this.query(Filter.type(PersistentSchema)).subscribe(() => {});
      this._ctx.onDispose(unsubscribe);
    }
  }

  @synchronized
  protected override async _close(): Promise<void> {
    this.opened.throw(new ContextDisposedError());
    this.opened.reset();
    await this._repoProxy.close();
  }

  // ── Space state ─────────────────────────────────────────────────────────

  @synchronized
  async setSpaceRoot(rootUrl: string): Promise<void> {
    log('setSpaceRoot', { rootUrl });
    const firstTime = this._rootUrl === undefined;
    this._rootUrl = rootUrl;
    if (this._lifecycleState === LifecycleState.OPEN) {
      if (firstTime) {
        await this._openWithSpaceState({ rootUrl });
      } else {
        await this._changeSpaceRoot({ rootUrl });
      }
    }
  }

  /**
   * Perform initial AM document load after the repo is open and a rootUrl is known.
   * Called from `_open()` when rootUrl is set, or from `setSpaceRoot()` the first time.
   */
  private async _openWithSpaceState(spaceState: SpaceState): Promise<void> {
    const start = performance.now();
    try {
      await this._loadSpaceRootDocHandle(this._ctx, spaceState);
      const spaceRootDocHandle = this.getSpaceRootDocHandle();
      const spaceRootDoc: DatabaseDirectory = spaceRootDocHandle.doc();
      invariant(spaceRootDoc);
      const objectIds = Object.keys(spaceRootDoc.objects ?? {});
      this._createInlineObjects(spaceRootDocHandle, objectIds);
      spaceRootDocHandle.on('change', this._onDocumentUpdate);
    } catch (err) {
      if (err instanceof ContextDisposedError) {
        return;
      }
      log.catch(err);
      throw err;
    }

    const elapsed = performance.now() - start;
    if (elapsed > 1_000) {
      log.warn('slow AM open', { docId: spaceState.rootUrl, duration: elapsed });
    }

    this.opened.wake();
  }

  /**
   * Update DB in response to a space root URL change.
   * Called from `setSpaceRoot()` when the root URL changes after the initial load.
   * Must be called from within a synchronized context (setSpaceRoot).
   */
  private async _changeSpaceRoot(spaceState: SpaceState): Promise<void> {
    invariant(this._ctx, 'Must be open');
    const currentRootUrl = this.getSpaceRootDocHandle().url;
    if (spaceState.rootUrl === currentRootUrl) {
      return;
    }
    this._unsubscribeFromHandles();
    const objectIdsToLoad = this._clearHandleReferences();

    try {
      await this._loadSpaceRootDocHandle(this._ctx, spaceState);
      const spaceRootDocHandle = this.getSpaceRootDocHandle();
      await this._handleSpaceRootDocumentChange(spaceRootDocHandle, objectIdsToLoad);
      spaceRootDocHandle.on('change', this._onDocumentUpdate);
    } catch (err) {
      if (err instanceof ContextDisposedError) {
        return;
      }
      log.catch(err);
      throw err;
    }
  }

  // ── User-facing Database API ─────────────────────────────────────────────

  /**
   * @internal
   * Called by echo-handler when a PersistentSchema object is encountered during deserialization.
   */
  _getOrRegisterPersistentSchema(schema: PersistentSchema): Type.AnyEntity {
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
    const schemaToStore = createPersistentObject(PersistentSchema, {
      [MetaId]: { keys: [], key: meta.typename, version: meta.version },
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

    const persistentSchema = this._addObject(schemaToStore);
    invariant(Type.isType(persistentSchema), 'persisted schema must materialize as a Type entity (kind=type)');
    return persistentSchema;
  }

  // TODO(burdon): Type check.
  /** @deprecated Use `db.query(Filter.id(id)).runSync()[0]` for a working-set lookup, or resolve via a {@link Ref}. */
  getObjectById<T extends Entity.Unknown = Entity.Any>(id: string, { deleted = false } = {}): T | undefined {
    const core = this.getObjectCoreById(id);
    if (!core || (core.isDeleted() && !deleted)) {
      return undefined;
    }

    return (core.rootProxy ?? initEchoReactiveObjectRootProxy(core, this)) as T;
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
    } else {
      query = Query.fromAst(bindOwningSpaceScopes(query.ast, this.spaceId));
    }

    return this._hypergraph.query(query);
  }

  /** @deprecated Mutate the object directly. */
  async update(_filter: Filter.Any, _operation: unknown): Promise<void> {
    throw new Error('Not implemented');
  }

  /** @deprecated Use `db.add`. */
  async insert(_data: unknown): Promise<never> {
    throw new Error('Not implemented');
  }

  /**
   * Add a reactive object or relation.
   */
  add<T extends Entity.Unknown = Entity.Unknown>(obj: T, opts?: Database.AddOptions): T {
    invariant(!Type.isType(obj), 'use db.addType() to persist Type entities');
    return this._addObject(obj, opts);
  }

  /**
   * Persist a Type definition (clones/forks the entity) so it replicates to other peers.
   */
  async addType<T extends Type.AnyEntity>(type: T): Promise<T> {
    invariant(Type.isType(type), 'addType expects a Type entity');
    const typename = Type.getTypename(type);
    const version = Type.getMeta(type).version ?? Type.getVersion(type);

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

    invariant(isEchoObject(obj));
    getObjectCore(obj).rootProxy = obj;

    const target = getProxyTarget(obj) as ProxyTarget & Entity.Unknown;
    EchoReactiveHandler.instance.setDatabase(target, this);
    EchoReactiveHandler.instance.saveRefs(target);
    this.addCore(getObjectCore(obj), opts);
    return obj;
  }

  remove<T extends Entity.Unknown = Entity.Unknown>(obj: T): void {
    assertArgument(isEchoObject(obj), 'obj');
    return this.removeCore(getObjectCore(obj));
  }

  async flush(opts?: Database.FlushOptions): Promise<void> {
    await this._flush(opts);
  }

  async runMigrations(migrations: ObjectMigration[]): Promise<void> {
    for (const migration of migrations) {
      const objects = await this._hypergraph.query(Query.select(Filter.typeURI(migration.fromType)).from(this)).run();
      log.verbose('migrate', {
        from: migration.fromType,
        to: migration.toType,
        objects: objects.length,
      });
      for (const object of objects) {
        const before = JSON.parse(JSON.stringify(object));

        const output = (await migration.transform(object, { db: this })) as any;
        const metaPatch = output?.[MetaId] as Partial<EntityMeta> | undefined;
        if (metaPatch !== undefined && output != null) {
          delete output[MetaId];
        }

        delete (output as any).id;

        await this.atomicReplaceObject(object.id, {
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
    await this._flush();
  }

  getSyncState(): Promise<SpaceSyncState> {
    return this._getSyncState();
  }

  subscribeToSyncState(ctx: Context, callback: (state: SpaceSyncState) => void): CleanupFn {
    return this._subscribeToSyncState(ctx, callback);
  }

  getAllObjectIds(): string[] {
    if (this._lifecycleState !== LifecycleState.OPEN || !this._spaceRootDocHandle) {
      return [];
    }

    const hasLoadedHandles = this._getAllDocHandles().length > 0;
    if (!hasLoadedHandles) {
      return [];
    }
    const rootDoc = this.getSpaceRootDocHandle().doc();
    if (!rootDoc) {
      return [];
    }

    return [...new Set([...Object.keys(rootDoc.objects ?? {}), ...Object.keys(rootDoc.links ?? {})])];
  }

  getNumberOfInlineObjects(): number {
    return Object.keys(this.getSpaceRootDocHandle().doc()?.objects ?? {}).length;
  }

  getNumberOfLinkedObjects(): number {
    return Object.keys(this.getSpaceRootDocHandle().doc()?.links ?? {}).length;
  }

  getTotalNumberOfObjects(): number {
    return this.getNumberOfInlineObjects() + this.getNumberOfLinkedObjects();
  }

  get rootChanged(): ReadOnlyEvent<void> {
    return this._rootChangedEvent;
  }

  getLoadedDocumentHandles(): DocHandleProxy<any>[] {
    return Object.values(this._repoProxy.handles);
  }

  get _repo(): RepoProxy {
    return this._repoProxy;
  }

  _getSpaceRootDocHandle(): DocHandleProxy<DatabaseDirectory> {
    return this.getSpaceRootDocHandle();
  }

  _updateServices({ dataService, queryService }: { dataService: DataService; queryService: QueryService }): void {
    this._dataService = dataService;
    this._queryService = queryService;
    this._repoProxy._updateDataService(dataService);
  }

  async _onReconnect(): Promise<void> {
    log('re-establishing database streams');
    await this._repoProxy._onReconnect();
    this._reconnected.emit();
  }

  /**
   * @internal
   */
  async _loadObjectById(objectId: string, options: LoadObjectOptions = {}): Promise<Entity.Unknown | undefined> {
    const core = await this.loadObjectCoreById(objectId, options);
    if (!core || (core?.isDeleted() && !options.allowDeleted)) {
      return undefined;
    }

    const obj = core.rootProxy ?? initEchoReactiveObjectRootProxy(core, this);
    invariant(isProxy(obj));
    return obj;
  }

  // ── Core object operations ───────────────────────────────────────────────

  /** @deprecated Return only loaded objects. */
  allObjectCores(): ObjectCore[] {
    return Array.from(this._objects.values());
  }

  getObjectCoreById(id: string, { load = true }: GetObjectCoreByIdOptions = {}): ObjectCore | undefined {
    if (!this._spaceRootDocHandle) {
      throw new Error('Database is not ready.');
    }

    const objCore = this._objects.get(id);
    if (!objCore) {
      if (load) {
        this._loadObjectDocument(id);
      }
      return undefined;
    }

    invariant(objCore instanceof ObjectCore);
    return objCore;
  }

  async loadObjectCoreById(
    objectId: string,
    { timeout, returnWithUnsatisfiedDeps, diskOnly }: LoadObjectOptions = {},
  ): Promise<ObjectCore | undefined> {
    if (diskOnly && this._unavailableObjects.has(objectId)) {
      return undefined;
    }
    const cachedCore = this.getObjectCoreById(objectId, { load: false });
    if (cachedCore && this._isCoreResolved(cachedCore, returnWithUnsatisfiedDeps)) {
      return this._coreOrUndefined(cachedCore, returnWithUnsatisfiedDeps);
    }

    const isReady = () => {
      if (diskOnly && this._unavailableObjects.has(objectId)) {
        return true;
      }
      const core = this.getObjectCoreById(objectId, { load: false });
      return core != null && this._isCoreResolved(core, returnWithUnsatisfiedDeps);
    };

    const waitForUpdate = this._updateEvent.waitFor(
      (event) => event.itemsUpdated.some(({ id }) => id === objectId) && isReady(),
    );
    this._loadObjectDocument(objectId, { diskOnly });

    await (timeout ? asyncTimeout(waitForUpdate, timeout) : waitForUpdate);

    if (diskOnly && this._unavailableObjects.has(objectId)) {
      return undefined;
    }
    const finalCore = this.getObjectCoreById(objectId, { load: false });
    if (!finalCore) {
      return undefined;
    }
    return this._coreOrUndefined(finalCore, returnWithUnsatisfiedDeps);
  }

  private _isCoreResolved(core: ObjectCore, returnWithUnsatisfiedDeps?: boolean): boolean {
    if (returnWithUnsatisfiedDeps || this._areDepsSatisfied(core)) {
      return true;
    }
    return this._areDepsResolved(core);
  }

  private _coreOrUndefined(core: ObjectCore, returnWithUnsatisfiedDeps?: boolean): ObjectCore | undefined {
    if (returnWithUnsatisfiedDeps || this._areDepsSatisfied(core)) {
      return core;
    }
    return undefined;
  }

  async batchLoadObjectCores(
    objectIds: string[],
    {
      inactivityTimeout = 30_000,
      returnDeleted = false,
      returnWithUnsatisfiedDeps = false,
      failOnTimeout = false,
    }: {
      inactivityTimeout?: number;
      returnDeleted?: boolean;
      returnWithUnsatisfiedDeps?: boolean;
      failOnTimeout?: boolean;
    } = {},
  ): Promise<(ObjectCore | undefined)[]> {
    if (!this._spaceRootDocHandle) {
      throw new Error('Database is not ready.');
    }

    const result: (ObjectCore | undefined)[] = new Array(objectIds.length);
    const objectsToLoad: Array<{ id: string; resultIndex: number }> = [];
    for (let i = 0; i < objectIds.length; i++) {
      const objectId = objectIds[i];

      if (!this._objectPresent(objectId)) {
        result[i] = undefined;
        continue;
      }

      const core = this.getObjectCoreById(objectId, { load: true });
      if (!returnDeleted && this._objects.get(objectId)?.isDeleted()) {
        result[i] = undefined;
      } else if (!returnWithUnsatisfiedDeps && core && !this._areDepsSatisfied(core)) {
        result[i] = undefined;
      } else if (core != null) {
        result[i] = core;
      } else {
        objectsToLoad.push({ id: objectId, resultIndex: i });
      }
    }
    if (objectsToLoad.length === 0) {
      return result;
    }
    const idsToLoad = objectsToLoad.map((v) => v.id);
    this._loadObjectDocument(idsToLoad);

    const startTime = TRACE_LOADING ? performance.now() : 0;
    const diagnostics: string[] = [];
    try {
      return await new Promise((resolve, reject) => {
        let unsubscribe: CleanupFn | null = null;
        let inactivityTimeoutTimer: any | undefined;
        const scheduleInactivityTimeout = () => {
          inactivityTimeoutTimer = setTimeout(() => {
            unsubscribe?.();
            if (failOnTimeout) {
              diagnostics.push('inactivity-rejected');
              reject(new TimeoutError(inactivityTimeout));
            } else {
              diagnostics.push('inactivity-resolved');
              resolve(result);
            }
          }, inactivityTimeout);
        };
        unsubscribe = this._updateEvent.on(({ itemsUpdated }) => {
          const updatedIds = itemsUpdated.map((v) => v.id);
          for (let i = objectsToLoad.length - 1; i >= 0; i--) {
            const objectToLoad = objectsToLoad[i];
            if (updatedIds.includes(objectToLoad.id)) {
              clearTimeout(inactivityTimeoutTimer);

              const isDeleted = this._objects.get(objectToLoad.id)?.isDeleted();
              const depsUnsatisfied =
                this._objects.get(objectToLoad.id) && !this._areDepsSatisfied(this._objects.get(objectToLoad.id)!);

              if (!returnDeleted && isDeleted) {
                diagnostics.push('object-deleted');
                result[objectToLoad.resultIndex] = undefined;
              } else if (!returnWithUnsatisfiedDeps && depsUnsatisfied) {
                diagnostics.push('deps-unsatisfied');
                result[objectToLoad.resultIndex] = undefined;
              } else {
                result[objectToLoad.resultIndex] = this.getObjectCoreById(objectToLoad.id)!;
              }

              objectsToLoad.splice(i, 1);
              scheduleInactivityTimeout();
            }
          }
          if (objectsToLoad.length === 0) {
            clearTimeout(inactivityTimeoutTimer);
            unsubscribe?.();
            resolve(result);
          }
        });
        scheduleInactivityTimeout();
      });
    } finally {
      if (TRACE_LOADING) {
        log.info('loading objects', { objectIds, elapsed: performance.now() - startTime, diagnostics });
      }
    }
  }

  addCore(core: ObjectCore, opts?: AddCoreOptions): void {
    if (core.entityManager) {
      if (core.entityManager !== this) {
        throw new Error('Object already belongs to another database');
      }

      if (core.isDeleted()) {
        core.setDeleted(false);
      }

      return;
    }

    invariant(!this._objects.has(core.id));
    this._objects.set(core.id, core);

    let spaceDocHandle: DocHandleProxy<DatabaseDirectory>;
    const placement = opts?.placeIn ?? 'linked-doc';
    switch (placement) {
      case 'linked-doc': {
        spaceDocHandle = this._createDocumentForObject(core.id);
        spaceDocHandle.on('change', this._onDocumentUpdate);
        break;
      }
      case 'root-doc': {
        spaceDocHandle = this.getSpaceRootDocHandle();
        this._onObjectBoundToDocument(spaceDocHandle, core.id);
        break;
      }
      default:
        throw new TypeError(`Unknown object placement: ${placement}`);
    }

    core.bind({
      db: this,
      docHandle: spaceDocHandle,
      path: ['objects', core.id],
      assignFromLocalState: true,
    });

    this._markObjectAvailable(core.id);
  }

  removeCore(core: ObjectCore): void {
    invariant(this._objects.has(core.id));
    core.setDeleted(true);
  }

  unlinkObjects(objectIds: string[]): void {
    const root = this.getSpaceRootDocHandle();
    for (const objectId of objectIds) {
      if (!root.doc().links?.[objectId]) {
        throw new Error(`Link not found: ${objectId}`);
      }
    }
    root.change((doc) => {
      for (const objectId of objectIds) {
        delete doc.links![objectId];
      }
    });
  }

  async unlinkDeletedObjects({ batchSize = 10 }: { batchSize?: number } = {}): Promise<void> {
    const idChunks = chunkArray(this.getAllObjectIds(), batchSize);
    for (const ids of idChunks) {
      const objects = await this.batchLoadObjectCores(ids, { returnDeleted: true });
      const toUnlink = objects.filter((o) => o?.isDeleted()).map((o) => o!.id);
      this.unlinkObjects(toUnlink);
    }
  }

  async atomicReplaceObject(id: EntityId, params: AtomicReplaceObjectProps): Promise<void> {
    const { data, type, meta } = params;

    const core = await this.loadObjectCoreById(id);
    invariant(core);

    const mappedData = deepMapValues(data, (value, recurse) => {
      if (Ref.isRef(value)) {
        return { '/': value.uri };
      }
      if (value instanceof Uint8Array) {
        return value;
      }
      return recurse(value);
    });
    delete mappedData.id;
    invariant(mappedData['@type'] === undefined);
    invariant(mappedData['@meta'] === undefined);

    const existingStruct: EntityStructure = deepMapValues(core.getDecoded([]), (value, recurse) =>
      value instanceof Uint8Array ? value : recurse(value),
    );
    const newStruct: EntityStructure = {
      ...existingStruct,
      data: mappedData,
    };

    if (type !== undefined) {
      newStruct.system!.type = EncodedReference.fromURI(type);
    }

    if (meta !== undefined) {
      newStruct.meta = { ...existingStruct.meta, ...meta };
    }

    core.setDecoded([], newStruct);
  }

  private async _flush({ disk = true, indexes = true, updates = false }: Database.FlushOptions = {}): Promise<void> {
    log('flush', { disk, indexes, updates });
    await this._waitForPendingCreations();
    if (disk) {
      await this._repoProxy.flush();
      await this._dataService.flush(
        {
          documentIds: this._getAllDocHandles()
            .map((handle) => handle.documentId)
            .filter((id): id is DocumentId => id != null),
        },
        { timeout: RPC_TIMEOUT },
      );
    }

    if (indexes) {
      await this._dataService.updateIndexes(undefined, { timeout: 0 });
    }

    if (updates) {
      await this._updateScheduler.runBlocking();
    }
  }

  async getDocumentHeads(): Promise<SpaceDocumentHeads> {
    const root = this.getSpaceRootDocHandle();
    const doc = root.doc();
    if (!doc || root.documentId == null) {
      return { heads: {} };
    }

    const headsStates = await this._dataService.getDocumentHeads(
      {
        documentIds: Object.values(doc.links ?? {}).map((link) =>
          interpretAsDocumentId(link.toString() as AutomergeUrl),
        ),
      },
      { timeout: RPC_TIMEOUT },
    );

    const heads: Record<string, string[]> = {};
    for (const state of headsStates.heads.entries ?? []) {
      heads[state.documentId] = state.heads ?? [];
    }

    heads[root.documentId] = getHeads(doc);

    return { heads };
  }

  async waitUntilHeadsReplicated(heads: SpaceDocumentHeads): Promise<void> {
    await this._dataService.waitUntilHeadsReplicated(
      {
        heads: {
          entries: Object.entries(heads.heads).map(([documentId, heads]) => ({ documentId, heads })),
        },
      },
      { timeout: 0 },
    );
  }

  async reIndexHeads(): Promise<void> {
    const root = this.getSpaceRootDocHandle();
    const doc = root.doc();
    invariant(doc);
    invariant(root.documentId, 'Space root document must have documentId');

    await this._dataService.reIndexHeads(
      {
        documentIds: [
          root.documentId,
          ...Object.values(doc.links ?? {}).map((link) => interpretAsDocumentId(link as AutomergeUrl)),
        ],
      },
      { timeout: 0 },
    );
  }

  /** @deprecated Use `flush()`. */
  async updateIndexes(): Promise<void> {
    await this._dataService.updateIndexes(undefined, { timeout: 0 });
  }

  private async _getSyncState(): Promise<SpaceSyncState> {
    const value = await Stream.first(
      this._dataService.subscribeSpaceSyncState({ spaceId: this.spaceId }, { timeout: RPC_TIMEOUT }),
    );
    return value ?? raise(new Error('Failed to get sync state'));
  }

  private _subscribeToSyncState(ctx: Context, callback: (state: SpaceSyncState) => void): CleanupFn {
    let currentStream: ReturnType<DataService['subscribeSpaceSyncState']> | undefined;

    const setupStream = () => {
      currentStream = this._dataService.subscribeSpaceSyncState({ spaceId: this.spaceId }, { timeout: RPC_TIMEOUT });
      currentStream.subscribe(
        (data) => {
          void runInContextAsync(ctx, () => callback(data));
        },
        (err) => {
          if (err instanceof RpcClosedError) {
            this._reconnected.once(ctx, () => setupStream());
          } else if (err) {
            ctx.raise(err);
          }
        },
      );
    };

    setupStream();
    ctx.onDispose(() => currentStream?.close());
    return () => currentStream?.close();
  }

  areStrongDepsSatisfied(core: ObjectCore): boolean {
    return this._areDepsSatisfied(core);
  }

  // ── Inlined doc-loader public surface ────────────────────────────────────

  getSpaceRootDocHandle(): DocHandleProxy<DatabaseDirectory> {
    invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    return this._spaceRootDocHandle;
  }

  getLinkedDocHandles(): DocHandleProxy<DatabaseDirectory>[] {
    const rootHandle = this._spaceRootDocHandle;
    return [...new Set(this._objectDocumentHandles.values())].filter((h) => h !== rootHandle);
  }

  getObjectDocumentId(objectId: string): string | undefined {
    invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    const spaceRootDoc = this._spaceRootDocHandle.doc();
    invariant(spaceRootDoc);
    if (spaceRootDoc.objects?.[objectId]) {
      return this._spaceRootDocHandle.documentId;
    }
    const documentUrl = this._getLinkedDocumentUrl(objectId);
    return documentUrl && interpretAsDocumentId(documentUrl.toString() as AutomergeUrl);
  }

  // ── Inlined doc-loader private implementation ─────────────────────────────

  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
  private async _loadSpaceRootDocHandle(ctx: Context, spaceState: SpaceState): Promise<void> {
    if (this._spaceRootDocHandle != null) {
      return;
    }
    if (!spaceState.rootUrl) {
      throw new Error('Database opened with no rootUrl');
    }

    const existingDocHandle = await this._initDocHandle(ctx, spaceState.rootUrl);
    const doc = existingDocHandle.doc();
    invariant(doc);
    invariant(doc.version === SpaceDocVersion.CURRENT);
    if (doc.access == null) {
      this._initDocAccess(existingDocHandle);
    }
    this._spaceRootDocHandle = existingDocHandle;
  }

  private _objectPresent(id: EntityId): boolean {
    assertState(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    return (
      DatabaseDirectory.getInlineObject(this._spaceRootDocHandle.doc(), id) != null ||
      DatabaseDirectory.getLink(this._spaceRootDocHandle.doc(), id) != null
    );
  }

  private _loadObjectDocument(objectIdOrMany: string | string[], opts: LoadObjectDocumentOptions = {}): void {
    const objectIds = Array.isArray(objectIdOrMany) ? objectIdOrMany : [objectIdOrMany];
    let hasUrlsToLoad = false;
    const urlsToLoad: DatabaseDirectory['links'] = {};
    for (const objectId of objectIds) {
      invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
      if (this._objectDocumentHandles.has(objectId) || this._objectsPendingDocumentLoad.has(objectId)) {
        continue;
      }
      const documentUrl = this._getLinkedDocumentUrl(objectId);
      if (documentUrl == null) {
        this._objectsPendingDocumentLoad.set(objectId, opts);
        const isInline = DatabaseDirectory.getInlineObject(this._spaceRootDocHandle.doc(), objectId) != null;
        if (!isInline) {
          log('object absent from space directory, marking unavailable', { objectId });
          this._onObjectUnavailable({ objectId });
        } else {
          log('loading delayed until object links are initialized', { objectId });
        }
      } else {
        urlsToLoad[objectId] = documentUrl;
        hasUrlsToLoad = true;
      }
    }
    if (hasUrlsToLoad) {
      this._loadLinkedObjects(urlsToLoad, opts);
    }
  }

  private _onObjectLinksUpdated(links: SpaceDocumentLinks): void {
    if (!links) {
      return;
    }
    const linksAwaitingLoad = Object.entries(links).filter(([objectId]) =>
      this._objectsPendingDocumentLoad.has(objectId),
    );
    if (linksAwaitingLoad.length > 0) {
      const groups = new Map<boolean, typeof linksAwaitingLoad>();
      for (const entry of linksAwaitingLoad) {
        const opts = this._objectsPendingDocumentLoad.get(entry[0]) ?? {};
        const key = !!opts.diskOnly;
        const bucket = groups.get(key) ?? [];
        bucket.push(entry);
        groups.set(key, bucket);
      }
      for (const [diskOnly, entries] of groups) {
        this._loadLinkedObjects(Object.fromEntries(entries), { diskOnly });
      }
    }
    linksAwaitingLoad.forEach(([objectId]) => this._objectsPendingDocumentLoad.delete(objectId));

    const newLinks = Object.entries(links).filter(
      ([objectId]) => !this._objectDocumentHandles.has(objectId) && !this._objectsPendingDocumentLoad.has(objectId),
    );
    if (newLinks.length > 0) {
      this._loadLinkedObjects(Object.fromEntries(newLinks), { diskOnly: true });
    }
  }

  private _onObjectBoundToDocument(handle: DocHandleProxy<DatabaseDirectory>, objectId: string): void {
    this._objectDocumentHandles.set(objectId, handle);
  }

  private _createDocumentForObject(objectId: string): DocHandleProxy<DatabaseDirectory> {
    invariant(this._spaceRootDocHandle, 'Database was not initialized with root object.');
    const spaceDocHandle = this._repoProxy.create<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: this._spaceKey.toHex() },
    });
    const creationPromise = spaceDocHandle
      .whenReady()
      .then(() => {
        if (this._spaceRootDocHandle == null) {
          log.warn('space root document handle is not available, skipping object binding', { objectId });
          return;
        }
        const url = spaceDocHandle.url;
        if (url == null) {
          log.warn('document has no url after whenReady, skipping object binding', { objectId });
          return;
        }
        this._spaceRootDocHandle.change((newDoc: DatabaseDirectory) => {
          newDoc.links ??= {};
          newDoc.links[objectId] = new A.RawString(url);
        });
      })
      .finally(() => {
        this._pendingDocumentCreations.delete(objectId);
      });
    this._pendingDocumentCreations.set(objectId, creationPromise);
    this._onObjectBoundToDocument(spaceDocHandle, objectId);

    return spaceDocHandle;
  }

  private async _waitForPendingCreations(): Promise<void> {
    await Promise.all([...this._pendingDocumentCreations.values()]);
  }

  private _clearHandleReferences(): string[] {
    const objectsWithHandles = [...this._objectDocumentHandles.keys()];
    this._objectDocumentHandles.clear();
    this._spaceRootDocHandle = null;
    return objectsWithHandles;
  }

  private _getAllDocHandles(): DocHandleProxy<DatabaseDirectory>[] {
    return this._spaceRootDocHandle != null
      ? [this._spaceRootDocHandle, ...new Set(this._objectDocumentHandles.values())]
      : [];
  }

  private _getLinkedDocumentUrl(objectId: string): AutomergeUrl | undefined {
    const spaceRootDoc = this._spaceRootDocHandle?.doc();
    invariant(spaceRootDoc);
    return (spaceRootDoc.links ?? {})[objectId]?.toString() as AutomergeUrl;
  }

  private _loadLinkedObjects(links: SpaceDocumentLinks, opts: LoadObjectDocumentOptions = {}): void {
    if (!links) {
      return;
    }
    for (const [objectId, automergeUrlData] of Object.entries(links)) {
      const automergeUrl = automergeUrlData.toString();
      const logMeta = { objectId, automergeUrl };
      const objectDocumentHandle = this._objectDocumentHandles.get(objectId);
      if (objectDocumentHandle?.url != null && objectDocumentHandle.url !== automergeUrl) {
        log.warn('object already inlined in a different document, ignoring the link', {
          ...logMeta,
          actualDocumentUrl: objectDocumentHandle.url,
        });
        continue;
      }
      if (objectDocumentHandle?.url === automergeUrl) {
        log.warn('object document was already loaded', logMeta);
        continue;
      }
      const handle = this._repoProxy.find<DatabaseDirectory>(automergeUrl as DocumentId);
      log.debug('document loading triggered', logMeta);
      this._objectDocumentHandles.set(objectId, handle);
      void this._loadHandleForObject(handle, objectId, opts);
    }
  }

  private async _initDocHandle(ctx: Context, url: string): Promise<DocHandleProxy<DatabaseDirectory>> {
    const docHandle = this._repoProxy.find<DatabaseDirectory>(url as DocumentId);
    await warnAfterTimeout(5_000, 'Automerge root doc load timeout (DatabaseImpl)', async () => {
      await cancelWithContext(ctx, docHandle.whenReady());
    });

    return docHandle;
  }

  private _initDocAccess(handle: DocHandleProxy<DatabaseDirectory>): void {
    handle.change((newDoc: DatabaseDirectory) => {
      newDoc.access ??= { spaceKey: this._spaceKey.toHex() };
      newDoc.access.spaceKey = this._spaceKey.toHex();
    });
  }

  private async _loadHandleForObject(
    handle: DocHandleProxy<DatabaseDirectory>,
    objectId: string,
    opts: LoadObjectDocumentOptions = {},
  ): Promise<void> {
    invariant(handle.url, 'Document URL is not available');
    try {
      if (this._currentlyLoadingObjects.has({ url: handle.url, objectId })) {
        log.verbose('document is already loading', { objectId });
        return;
      }
      this._currentlyLoadingObjects.add({ url: handle.url, objectId });

      if (opts.diskOnly) {
        const onDisk = await handle.whenSettledOnDisk();
        if (!onDisk) {
          this._currentlyLoadingObjects.delete({ url: handle.url, objectId });
          log('object document unavailable on disk', { objectId, docUrl: handle.url });
          this._onObjectUnavailable({ handle, objectId });
          handle
            .whenReady()
            .then(() => {
              if (this._objectDocumentHandles.get(objectId) !== handle) {
                return;
              }
              this._onObjectDocumentLoaded({ handle, objectId });
            })
            .catch((err) => log.verbose('background network wait failed', { objectId, err }));
          return;
        }
      }

      await handle.whenReady();
      this._currentlyLoadingObjects.delete({ url: handle.url, objectId });

      const logMeta = { objectId, docUrl: handle.url };
      const objectDocHandle = this._objectDocumentHandles.get(objectId);
      if (objectDocHandle?.url != null && objectDocHandle.url !== handle.url) {
        log.warn('object was rebound while a document was loading, discarding handle', logMeta);
        return;
      }
      this._onObjectDocumentLoaded({ handle, objectId });
    } catch (err) {
      this._currentlyLoadingObjects.delete({ url: handle.url, objectId });
      log.warn('failed to load a document, retrying', {
        objectId,
        automergeUrl: handle.url,
        err,
      });
      await this._loadHandleForObject(handle, objectId, opts);
    }
  }

  // ── Private document change handlers ────────────────────────────────────

  private async _handleSpaceRootDocumentChange(
    spaceRootDocHandle: DocHandleProxy<DatabaseDirectory>,
    objectsToLoad: string[],
  ): Promise<void> {
    const spaceRootUrl = spaceRootDocHandle.url;
    if (spaceRootUrl == null) {
      log.warn('space root document has no url');
      return;
    }

    const spaceRootDoc: DatabaseDirectory = spaceRootDocHandle.doc();
    const inlinedObjectIds = new Set(Object.keys(spaceRootDoc.objects ?? {}));
    const linkedObjectIds = new Map(Object.entries(spaceRootDoc.links ?? {}).map(([k, v]) => [k, v.toString()]));

    const objectsToRebind = new Map<string, { handle: DocHandleProxy<DatabaseDirectory>; objectIds: string[] }>();
    objectsToRebind.set(spaceRootUrl, { handle: spaceRootDocHandle, objectIds: [] });

    const objectsToRemove: string[] = [];
    const objectsToCreate = [...inlinedObjectIds.values()].filter((oid) => !this._objects.has(oid));

    for (const object of this._objects.values()) {
      if (inlinedObjectIds.has(object.id)) {
        if (object.docHandle?.url != null && object.docHandle.url === spaceRootUrl) {
          continue;
        }
        objectsToRebind.get(spaceRootUrl)!.objectIds.push(object.id);
      } else if (linkedObjectIds.has(object.id)) {
        const newObjectDocUrl = linkedObjectIds.get(object.id)!;
        if (object.docHandle?.url != null && object.docHandle.url === newObjectDocUrl) {
          continue;
        }
        const existing = objectsToRebind.get(newObjectDocUrl.toString());
        if (existing != null) {
          existing.objectIds.push(object.id);
          continue;
        }
        const newDocHandle = this._repoProxy.find(newObjectDocUrl as DocumentId);
        await newDocHandle.whenReady();
        newDocHandle.doc();
        objectsToRebind.set(newObjectDocUrl.toString(), { handle: newDocHandle, objectIds: [object.id] });
      } else {
        objectsToRemove.push(object.id);
      }
    }

    objectsToRemove.forEach((oid) => this._objects.delete(oid));
    this._createInlineObjects(spaceRootDocHandle, objectsToCreate);
    for (const { handle, objectIds } of objectsToRebind.values()) {
      this._rebindObjects(handle, objectIds);
    }
    for (const objectId of objectsToLoad) {
      if (!this._objects.has(objectId)) {
        this._loadObjectDocument(objectId);
      }
    }
    this._onObjectLinksUpdated(spaceRootDoc.links);
    this._rootChangedEvent.emit();
  }

  private _emitObjectUpdateEvent(itemsUpdated: string[]): void {
    if (itemsUpdated.length === 0) {
      return;
    }

    batchEvents(() => {
      for (const id of itemsUpdated) {
        const objCore = this._objects.get(id);
        if (objCore) {
          objCore.notifyUpdate();
        }
      }
    });
  }

  private readonly _onDocumentUpdate = (event: ChangeEvent<DatabaseDirectory>) => {
    const documentChanges = this._processDocumentUpdate(event);
    this._rebindObjects(event.handle, documentChanges.objectsToRebind);
    this._onObjectLinksUpdated(documentChanges.linkedDocuments);
    this._createInlineObjects(event.handle, documentChanges.createdObjectIds);
    this._emitObjectUpdateEvent(documentChanges.updatedObjectIds);
    this._scheduleThrottledDbUpdate(documentChanges.updatedObjectIds);
  };

  private _processDocumentUpdate(event: ChangeEvent<DatabaseDirectory>): DocumentChanges {
    const { inlineChangedObjects, linkedDocuments } = getInlineAndLinkChanges(event);
    const createdObjectIds: string[] = [];
    const objectsToRebind: string[] = [];
    for (const updatedObject of inlineChangedObjects) {
      const objectCore = this._objects.get(updatedObject);
      if (!objectCore) {
        createdObjectIds.push(updatedObject);
      } else if (
        objectCore.docHandle?.url != null &&
        event.handle.url != null &&
        objectCore.docHandle.url !== event.handle.url
      ) {
        log.verbose('object bound to incorrect document, going to rebind', {
          updatedObject,
          documentUrl: objectCore.docHandle.url,
          actualUrl: event.handle.url,
        });
        objectsToRebind.push(updatedObject);
      }
    }

    return {
      updatedObjectIds: inlineChangedObjects,
      objectsToRebind,
      createdObjectIds,
      linkedDocuments,
    };
  }

  private _unsubscribeFromHandles(): void {
    for (const docHandle of Object.values(this._repoProxy.handles)) {
      docHandle.off('change', this._onDocumentUpdate);
    }
  }

  private _onObjectDocumentLoaded({ handle, objectId }: ObjectDocumentLoaded): void {
    handle.on('change', this._onDocumentUpdate);

    this._markObjectAvailable(objectId);

    if (this._objects.has(objectId)) {
      return;
    }

    const core = this._createObjectInDocument(handle, objectId);
    const depsSatisfied = this._areDepsSatisfied(core);
    if (depsSatisfied) {
      this._scheduleThrottledUpdate([objectId]);
    } else {
      for (const dep of core.getStrongDependencies()) {
        if (!EID.isLocal(dep)) {
          continue;
        }
        const id = EID.getEntityId(dep);
        if (id) {
          this._loadObjectDocument(id, { diskOnly: true });
        }
      }
    }
    const queue = [objectId],
      seen = new Set<string>();
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);

      if (this._objects.has(id)) {
        for (const dep of this._strongDepsIndex.get(id) ?? []) {
          queue.push(dep);
          const core = this._objects.get(dep);
          if (core && this._areDepsSatisfied(core)) {
            this._scheduleThrottledUpdate([core.id]);
          }
        }
      }
    }
  }

  private _createInlineObjects(docHandle: DocHandleProxy<DatabaseDirectory>, objectIds: string[]): void {
    for (const id of objectIds) {
      invariant(!this._objects.has(id));
      this._createObjectInDocument(docHandle, id);
    }
  }

  private _createObjectInDocument(docHandle: DocHandleProxy<DatabaseDirectory>, objectId: string): ObjectCore {
    invariant(!this._objects.get(objectId));
    const core = new ObjectCore();
    core.id = objectId;
    this._objects.set(core.id, core);
    this._markObjectAvailable(objectId);
    this._onObjectBoundToDocument(docHandle, objectId);
    core.bind({
      db: this,
      docHandle,
      path: ['objects', core.id],
      assignFromLocalState: false,
    });

    const deps = core.getStrongDependencies();
    for (const dep of deps) {
      if (!EID.isLocal(dep)) {
        continue;
      }
      const depObjectId = EID.getEntityId(dep);
      if (!depObjectId || this._objects.has(depObjectId)) {
        continue;
      }

      defaultMap(this._strongDepsIndex, depObjectId, []).push(core.id);
    }

    return core;
  }

  private _areDepsSatisfied(core: ObjectCore, seen?: Set<EntityId>): boolean {
    seen ??= new Set<EntityId>();
    const deps = core.getStrongDependencies();

    seen.add(core.id);
    return deps.every((dep) => {
      if (!EID.isLocal(dep)) {
        return true;
      }
      const depObjectId = EID.getEntityId(dep);
      if (!depObjectId) {
        return true;
      }
      const depCore = this._objects.get(depObjectId);
      if (!depCore) {
        return false;
      }
      if (seen.has(depCore.id)) {
        return true;
      }
      return this._areDepsSatisfied(depCore, seen);
    });
  }

  private _areDepsResolved(core: ObjectCore, seen?: Set<EntityId>): boolean {
    seen ??= new Set<EntityId>();
    const deps = core.getStrongDependencies();

    seen.add(core.id);
    return deps.every((dep) => {
      if (!EID.isLocal(dep)) {
        return true;
      }
      const depObjectId = EID.getEntityId(dep);
      if (!depObjectId || this._unavailableObjects.has(depObjectId)) {
        return true;
      }
      const depCore = this._objects.get(depObjectId);
      if (!depCore) {
        return false;
      }
      if (seen.has(depCore.id)) {
        return true;
      }
      return this._areDepsResolved(depCore, seen);
    });
  }

  private _markObjectAvailable(objectId: string): void {
    if (this._unavailableObjects.delete(objectId)) {
      this._scheduleThrottledUpdate([objectId, ...(this._strongDepsIndex.get(objectId) ?? [])]);
    }
  }

  private _onObjectUnavailable({ objectId }: ObjectUnavailable): void {
    if (this._unavailableObjects.has(objectId)) {
      return;
    }
    this._unavailableObjects.add(objectId);
    const toWake = new Set<EntityId>([objectId]);
    const queue: EntityId[] = [objectId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const dep of this._strongDepsIndex.get(id) ?? []) {
        if (!toWake.has(dep)) {
          toWake.add(dep);
          queue.push(dep);
        }
      }
    }
    this._scheduleThrottledUpdate([...toWake]);
  }

  private _rebindObjects(docHandle: DocHandleProxy<DatabaseDirectory>, objectIds: string[]): void {
    for (const objectId of objectIds) {
      const objectCore = this._objects.get(objectId);
      invariant(objectCore);
      objectCore.bind({
        db: this,
        docHandle,
        path: objectCore.mountPath,
        assignFromLocalState: false,
      });
      this._onObjectBoundToDocument(docHandle, objectId);
    }
  }

  // ── Update scheduling ────────────────────────────────────────────────────

  private _objectsForNextDbUpdate = new Set<string>();
  private _objectsForNextUpdate = new Set<string>();
  private _updateScheduler = new UpdateScheduler(this._ctx, async () => this._emitDbUpdateEvents(this._ctx), {
    maxFrequency: THROTTLED_UPDATE_FREQUENCY,
  });

  @trace.span({ showInBrowserTimeline: true, showInRemoteTracing: false })
  private _emitDbUpdateEvents(_ctx: Context): void {
    const fullUpdateIds = [...this._objectsForNextUpdate];
    const allDbUpdates = new Set([...this._objectsForNextUpdate, ...this._objectsForNextDbUpdate]);
    this._objectsForNextUpdate.clear();
    this._objectsForNextDbUpdate.clear();

    batchEvents(() => {
      if (allDbUpdates.size > 0) {
        this._updateEvent.emit({
          spaceId: this.spaceId,
          itemsUpdated: [...allDbUpdates].map((id) => ({ id })),
        });
      }
      this._emitObjectUpdateEvent(fullUpdateIds);
    });
  }

  private _scheduleThrottledUpdate(objectId: string[]): void {
    for (const id of objectId) {
      this._objectsForNextUpdate.add(id);
    }
    if (DISABLE_THROTTLING) {
      this._updateScheduler.forceTrigger();
    } else {
      this._updateScheduler.trigger();
    }
  }

  private _scheduleThrottledDbUpdate(objectId: string[]): void {
    for (const id of objectId) {
      this._objectsForNextDbUpdate.add(id);
    }
    if (DISABLE_THROTTLING) {
      this._updateScheduler.forceTrigger();
    } else {
      this._updateScheduler.trigger();
    }
  }

  // ── Deprecated API ───────────────────────────────────────────────────────

  /** @deprecated */
  readonly pendingBatch = new Event<unknown>();

  // ── Private event field ──────────────────────────────────────────────────

  // `rootChanged` is exposed as ReadOnlyEvent via the getter above;
  // the mutable Event lives here to allow internal emits.
  private readonly _rootChangedEvent = new Event<void>();
}

// TODO(burdon): Create APIError class.
const createSchemaNotRegisteredError = (schema?: any) => {
  const message = 'Schema not registered';
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

const RPC_TIMEOUT = 20_000;

const DISABLE_THROTTLING = true;

export {
  type AddCoreOptions,
  type AtomicReplaceObjectProps,
  type DocumentChanges,
  type GetObjectCoreByIdOptions,
  type IDatabaseBinding,
  type ItemsUpdatedEvent,
  type LoadObjectDocumentOptions,
  type LoadObjectOptions,
  META_NAMESPACE,
  type SpaceDocumentHeads,
} from '../core-db';
