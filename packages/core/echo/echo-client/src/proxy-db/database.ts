//
// Copyright 2022 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { inspect } from 'node:util';

import { type CleanupFn, Event, type ReadOnlyEvent, synchronized } from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { inspectObject } from '@dxos/debug';
import {
  type Blob,
  Database,
  Entity,
  Feed,
  Filter,
  JsonSchema,
  Obj,
  Query,
  QueryAST,
  Ref,
  type Registry,
  Type,
} from '@dxos/echo';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import {
  type AnyProperties,
  EntityKind,
  type EntityMeta,
  MetaId,
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
import { EID, EntityId, type PublicKey, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { type FeedProtocol } from '@dxos/protocols';
import { type QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import { type DataService, type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
import { defaultMap } from '@dxos/util';

import type { SaveStateChangedEvent } from '../automerge';
import { type DocHandleProxy, type RepoProxy } from '../automerge';
import { EntityManager } from '../core-db';
import {
  EchoReactiveHandler,
  type ProxyTarget,
  createObject,
  getObjectCore,
  initEchoReactiveObjectRootProxy,
  isEchoObject,
} from '../echo-handler';
import { FeedHandle } from '../feed/feed-handle';
import { type HypergraphImpl } from '../hypergraph';
import { type ObjectMigration } from './object-migration';

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

  /**
   * Removes feed entities by id.
   */
  removeFeedItemsByIds(feed: Feed.Feed, ids: string[]): Promise<void>;

  /**
   * Syncs a feed with the server.
   */
  syncFeed(feed: Feed.Feed, options?: Feed.SyncOptions): Promise<void>;

  getFeedSyncState(feed: Feed.Feed): Promise<Feed.SyncState>;
}

export type EchoDatabaseProps = {
  graph: HypergraphImpl;
  dataService: DataService;
  queryService: QueryService;
  feedService?: FeedProtocol.FeedService;
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
 * Implements EchoDatabase interface; delegates all document and core-object
 * operations to EntityManager.
 */
export class DatabaseImpl extends Resource implements EchoDatabase {
  readonly [Database.TypeId]: typeof Database.TypeId = Database.TypeId;

  /**
   * @internal
   */
  readonly _entityManager: EntityManager;

  readonly saveStateChanged: ReadOnlyEvent<SaveStateChangedEvent>;

  private readonly _hypergraph: HypergraphImpl;
  private _rootUrl: string | undefined = undefined;
  private readonly _reactiveSchemaQuery: boolean;
  private readonly _preloadSchemaOnOpen: boolean;

  /**
   * Backend for feed operations. Set on construction and refreshed on reconnect.
   */
  #feedService: FeedProtocol.FeedService | undefined;

  /**
   * Feed handles keyed by feed URI. A feed is a regular ECHO object whose items live in an
   * EDGE queue addressed by the feed object's URI; this map caches the per-feed client handle.
   */
  readonly #feeds = new Map<EID.EID, FeedHandle>();

  constructor(params: EchoDatabaseProps) {
    super();

    this._reactiveSchemaQuery = params.reactiveSchemaQuery ?? true;
    this._preloadSchemaOnOpen = params.preloadSchemaOnOpen ?? true;
    this._hypergraph = params.graph;
    this.#feedService = params.feedService;

    this._entityManager = new EntityManager({
      graph: params.graph,
      dataService: params.dataService,
      queryService: params.queryService,
      spaceId: params.spaceId,
      spaceKey: params.spaceKey,
    });

    this.saveStateChanged = this._entityManager.saveStateChanged;
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return {
      id: this._entityManager.spaceId,
      objects: this._entityManager.allObjectCores().length,
    };
  }

  get spaceId(): SpaceId {
    return this._entityManager.spaceId;
  }

  /** @deprecated Use spaceId. */
  get spaceKey(): PublicKey {
    return this._entityManager.spaceKey;
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

  get _updateEvent() {
    return this._entityManager._updateEvent;
  }

  get opened() {
    return this._entityManager.opened;
  }

  get rootChanged() {
    return this._entityManager.rootChanged;
  }

  // ── Resource lifecycle ──────────────────────────────────────────────────

  @synchronized
  protected override async _open(): Promise<void> {
    await this._entityManager.open(this._ctx);

    if (this._rootUrl !== undefined) {
      await this._entityManager.openWithSpaceState(this._ctx, { rootUrl: this._rootUrl });
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
    await Promise.allSettled([...this.#feeds.values()].map((feed) => feed.dispose()));
    this.#feeds.clear();
    await this._entityManager.close();
  }

  // ── Space state ─────────────────────────────────────────────────────────

  @synchronized
  async setSpaceRoot(rootUrl: string): Promise<void> {
    log('setSpaceRoot', { rootUrl });
    const firstTime = this._rootUrl === undefined;
    this._rootUrl = rootUrl;
    if (this._lifecycleState === LifecycleState.OPEN) {
      if (firstTime) {
        await this._entityManager.openWithSpaceState(this._ctx, { rootUrl });
      } else {
        await this._entityManager.updateSpaceState(this._ctx, { rootUrl });
      }
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

  // TODO(burdon): Type check.
  /** @deprecated Use `db.query(Filter.id(id)).runSync()[0]` for a working-set lookup, or resolve via a {@link Ref}. */
  getObjectById<T extends Entity.Unknown = Entity.Any>(id: string, { deleted = false } = {}): T | undefined {
    const core = this._entityManager.getObjectCoreById(id);
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
      if (!isProxy(obj) && !Entity.isEntity(obj)) {
        throw new TypeError('db.add expects a reactive ECHO object. Plain objects must be created using Obj.make(Type, props).');
      }

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
    // Re-stamp relation endpoints now that the database (and thus space) is known: cross-space
    // endpoints become absolute, same-space relative, and unpersisted endpoints are added here.
    EchoReactiveHandler.instance.rebindRelationEndpoints(target);
    EchoReactiveHandler.instance.saveRefs(target);
    this._entityManager.addCore(getObjectCore(obj), opts);
    return obj;
  }

  remove<T extends Entity.Unknown = Entity.Unknown>(obj: T): void {
    assertArgument(isEchoObject(obj), 'obj');
    return this._entityManager.removeCore(getObjectCore(obj));
  }

  //
  // Feeds.
  //

  async appendToFeed(feed: Feed.Feed, entities: Entity.Unknown[]): Promise<void> {
    await this.#getFeedHandle(feed).append(entities);
  }

  async deleteFromFeed(feed: Feed.Feed, entities: Entity.Unknown[]): Promise<void> {
    await this.removeFeedItemsByIds(
      feed,
      entities.map((entity) => entity.id),
    );
  }

  async removeFeedItemsByIds(feed: Feed.Feed, ids: string[]): Promise<void> {
    await this.#getFeedHandle(feed).delete(ids);
  }

  async syncFeed(feed: Feed.Feed, options?: Feed.SyncOptions): Promise<void> {
    await this.#getFeedHandle(feed).sync(options);
  }

  async getFeedSyncState(feed: Feed.Feed): Promise<Feed.SyncState> {
    return this.#getFeedHandle(feed).getSyncState();
  }

  /**
   * @internal
   * Sets or refreshes the feed backend service (e.g. after reconnection).
   */
  _setFeedService(service: FeedProtocol.FeedService | undefined): void {
    this.#feedService = service;
  }

  /**
   * @internal
   * Returns the feed handle for a URI, creating it if a backend service is available.
   * Returns `undefined` only when no service is connected.
   */
  _getOrCreateFeedHandle(feedUri: EID.EID, namespace?: string): FeedHandle {
    assertState(this.#feedService, 'Feed service not connected');
    const existing = this.#feeds.get(feedUri);
    if (existing) {
      return existing;
    }
    const handle = new FeedHandle(
      this.#feedService,
      this.graph.createRefResolver({ context: { space: this.spaceId, feed: feedUri } }),
      feedUri,
      this,
      namespace,
    );
    this.#feeds.set(feedUri, handle);
    return handle;
  }

  /**
   * @internal
   * Returns an already-instantiated feed handle for a URI, without creating one.
   */
  _tryGetFeedHandle(feedUri: EID.EID): FeedHandle | undefined {
    return this.#feeds.get(feedUri);
  }

  /**
   * @internal
   * Iterates feed handles already instantiated in this database.
   */
  _knownFeedHandles(): Iterable<FeedHandle> {
    return this.#feeds.values();
  }

  #getFeedHandle(feed: Feed.Feed): FeedHandle {
    const feedUri = Feed.getFeedUri(feed);
    invariant(feedUri, 'Feed must be stored in the database before accessing its contents');
    const handle = this._getOrCreateFeedHandle(feedUri, feed.namespace);
    handle.setParentEntity(feed as Obj.Unknown);
    return handle;
  }

  //
  // Blobs.
  //

  async createBlob(bytes: Uint8Array, options?: { type?: string; storage?: string }): Promise<Blob.Blob> {
    return this.graph.blobManager.createBlob(this.spaceId, bytes, options);
  }

  async readBlob(blob: Blob.Blob): Promise<Uint8Array> {
    return this.graph.blobManager.readBlob(this.spaceId, blob);
  }

  async blobExists(blob: Blob.Blob): Promise<boolean> {
    return this.graph.blobManager.blobExists(this.spaceId, blob);
  }

  async getBlobUrl(blob: Blob.Blob): Promise<string | undefined> {
    return this.graph.blobManager.getBlobUrl(this.spaceId, blob);
  }

  async flush(opts?: Database.FlushOptions): Promise<void> {
    await this._entityManager.flush(opts);
  }

  async runMigrations(migrations: ObjectMigration[]): Promise<void> {
    for (const migration of migrations) {
      const objects = await this._hypergraph.query(Query.select(Filter.type(migration.fromType)).from(this)).run();
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

        await this._entityManager.atomicReplaceObject(object.id, {
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
    await this._entityManager.flush();
  }

  getSyncState(): Promise<SpaceSyncState> {
    return this._entityManager.getSyncState();
  }

  subscribeToSyncState(ctx: Context, callback: (state: SpaceSyncState) => void): CleanupFn {
    return this._entityManager.subscribeToSyncState(ctx, callback);
  }

  getAllObjectIds(): string[] {
    return this._entityManager.getAllObjectIds();
  }

  getNumberOfInlineObjects(): number {
    return this._entityManager.getNumberOfInlineObjects();
  }

  getNumberOfLinkedObjects(): number {
    return this._entityManager.getNumberOfLinkedObjects();
  }

  getTotalNumberOfObjects(): number {
    return this._entityManager.getTotalNumberOfObjects();
  }

  getLoadedDocumentHandles(): DocHandleProxy<any>[] {
    return this._entityManager.getLoadedDocumentHandles();
  }

  get _repo(): RepoProxy {
    return this._entityManager._repoProxy;
  }

  _getSpaceRootDocHandle(): DocHandleProxy<DatabaseDirectory> {
    return this._entityManager.getSpaceRootDocHandle();
  }

  getSpaceRootDocHandle(): DocHandleProxy<DatabaseDirectory> {
    return this._entityManager.getSpaceRootDocHandle();
  }

  getLinkedDocHandles(): DocHandleProxy<DatabaseDirectory>[] {
    return this._entityManager.getLinkedDocHandles();
  }

  getObjectDocumentId(objectId: string): string | undefined {
    return this._entityManager.getObjectDocumentId(objectId);
  }

  getObjectCoreById(id: string, opts?: Parameters<EntityManager['getObjectCoreById']>[1]) {
    return this._entityManager.getObjectCoreById(id, opts);
  }

  loadObjectCoreById(objectId: string, options?: Parameters<EntityManager['loadObjectCoreById']>[1]) {
    return this._entityManager.loadObjectCoreById(objectId, options);
  }

  batchLoadObjectCores(objectIds: string[], options?: Parameters<EntityManager['batchLoadObjectCores']>[1]) {
    return this._entityManager.batchLoadObjectCores(objectIds, options);
  }

  atomicReplaceObject(id: string, params: Parameters<EntityManager['atomicReplaceObject']>[1]) {
    return this._entityManager.atomicReplaceObject(id, params);
  }

  allObjectCores() {
    return this._entityManager.allObjectCores();
  }

  areStrongDepsSatisfied(core: Parameters<EntityManager['areStrongDepsSatisfied']>[0]) {
    return this._entityManager.areStrongDepsSatisfied(core);
  }

  getDocumentHeads() {
    return this._entityManager.getDocumentHeads();
  }

  waitUntilHeadsReplicated(heads: Parameters<EntityManager['waitUntilHeadsReplicated']>[0]) {
    return this._entityManager.waitUntilHeadsReplicated(heads);
  }

  reIndexHeads() {
    return this._entityManager.reIndexHeads();
  }

  /** @deprecated Use `flush()`. */
  async updateIndexes(): Promise<void> {
    await this._entityManager.updateIndexes();
  }

  /**
   * Update service references after reconnection.
   */
  _updateServices({
    dataService,
    queryService,
    feedService,
  }: {
    dataService: DataService;
    queryService: QueryService;
    feedService?: FeedProtocol.FeedService;
  }): void {
    this._entityManager._updateServices({ dataService, queryService });
    if (feedService !== undefined) {
      this.#feedService = feedService;
    }
  }

  async _onReconnect(): Promise<void> {
    await this._entityManager._onReconnect();
  }

  /**
   * @internal
   */
  async _loadObjectById(objectId: string, options: any = {}): Promise<Entity.Unknown | undefined> {
    const core = await this._entityManager.loadObjectCoreById(objectId, options);
    if (!core || (core?.isDeleted() && !options.allowDeleted)) {
      return undefined;
    }

    const obj = defaultMap(
      this._rootProxies,
      core,
      () => core.rootProxy ?? initEchoReactiveObjectRootProxy(core, this),
    );
    invariant(isProxy(obj));
    return obj;
  }

  // ── Deprecated API ───────────────────────────────────────────────────────

  /** @deprecated */
  readonly pendingBatch = new Event<unknown>();

  /** @internal */
  private readonly _rootProxies = new Map<any, Entity.Unknown>();
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
