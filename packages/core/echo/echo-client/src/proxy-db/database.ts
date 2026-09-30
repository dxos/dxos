//
// Copyright 2022 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import { type AutomergeUrl } from '@automerge/automerge-repo';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import * as EffectContext from 'effect/Context';
import * as Equal from 'effect/Equal';
import * as Schema from 'effect/Schema';
import { inspect } from 'node:util';

import { type CleanupFn, Event, Mutex, type ReadOnlyEvent, synchronized } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { inspectObject } from '@dxos/debug';
import {
  type Blob,
  type Change,
  Database,
  Entity,
  Feed,
  Filter,
  JsonSchema,
  Lens,
  Migration,
  Obj,
  Query,
  QueryAST,
  Ref,
  type Registry,
  Type,
  VersionLens,
} from '@dxos/echo';
import {
  DATA_NAMESPACE,
  type DatabaseDirectory,
  EncodedReference,
  type EntityMeta as ProtocolEntityMeta,
  isEdgePeerId,
} from '@dxos/echo-protocol';
import {
  type AnyProperties,
  EntityKind,
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
import { SchemaEx } from '@dxos/effect';
import { assertArgument, assertState, invariant } from '@dxos/invariant';
import { DXN, EID, EntityId, type PublicKey, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError, runServiceCall, subscribeStream } from '@dxos/protocols';
import { type DataService, type FeedService, type QueryService } from '@dxos/protocols/rpc';
import { setDeep } from '@dxos/util';

import type { SaveStateChangedEvent } from '../automerge/index.ts';
import { type DocHandleProxy, type RepoProxy } from '../automerge/index.ts';
import {
  type BranchStore,
  EntityManager,
  type LoadObjectOptions,
  META_NAMESPACE,
  SYSTEM_NAMESPACE,
} from '../core-db/index.ts';
import {
  EchoReactiveHandler,
  type ProxyTarget,
  checkoutVersionSnapshot,
  createObject,
  getObjectChanges,
  getObjectConflict,
  getObjectCore,
  initEchoReactiveObjectRootProxy,
  isEchoObject,
} from '../echo-handler/index.ts';
import { FeedHandle } from '../feed/feed-handle.ts';
import { type HypergraphImpl } from '../hypergraph.ts';
import { runArrayFanOutMigration, runStampElementIdsMigration } from './array-fan-out.ts';
import { computeGuardedDataWrites, encodedValuesEqual, getDecodedDataWithRefs } from './encoded-value.ts';
import { runFanInMigration } from './fan-in.ts';
import { type FoldForwardOptions, foldForwardMigrations } from './fold-forward.ts';
import { createObjectMigrationContext } from './migration-context.ts';
import {
  type SyncVersionsOptions,
  type VersionSettled,
  syncVersionDocuments,
} from './version-documents/version-runner.ts';

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
  runMigrations(migrations: Migration.Migration[]): Promise<void>;

  /**
   * Folds a late old-shape write forward into a previously migrated object: for objects of each
   * migration's `toType` carrying its marker whose retired properties changed since the marker's
   * checkpoint, recomputes and applies the difference. `runMigrations` calls it at the end of every
   * run; call it directly to fold without re-running the migrations.
   */
  foldForward(migrations: Migration.Migration[], options?: FoldForwardOptions): Promise<void>;

  /**
   * Folds forward, debounced, whenever objects in this database change — the objects a replicated
   * late write touches. `getMigrations` is read on each pass so the current set always applies.
   */
  watchFoldForward(getMigrations: () => Migration.Migration[], options?: { debounceMs?: number }): CleanupFn;

  /**
   * Keeps every version document of the objects of each lens's type present and in sync: creates the
   * versions an object lacks, merges duplicate version documents, and translates edits between the
   * versions. Without `objectIds`, covers every object of those types.
   */
  syncVersions(lenses: readonly VersionLens.VersionLens[], options?: SyncVersionsOptions): Promise<void>;

  /**
   * The object at version `type` of its type: the live object when it reads that version, else an object
   * bound to that version's document, whose edits are translated to the object's other versions.
   * Undefined when the object has no document for that version.
   */
  version<S extends Type.AnyObj>(obj: Obj.Unknown, type: S): Promise<Type.InstanceType<S> | undefined>;

  /**
   * Syncs versions once for every object, then again, debounced, for each object whose documents
   * change. `getLenses` is read on each pass so the current set always applies.
   */
  watchVersions(getLenses: () => readonly VersionLens.VersionLens[], options?: { debounceMs?: number }): CleanupFn;

  /**
   * Get the current per-peer automerge document sync state.
   */
  getAutomergeSyncState(): Promise<DataService.SpaceSyncState>;

  /**
   * Get notification about the per-peer automerge document sync progress.
   */
  subscribeToAutomergeSyncState(ctx: Context, callback: (state: DataService.SpaceSyncState) => void): CleanupFn;

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
  getLoadedDocumentHandles(): DocHandleProxy<unknown>[];

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

  //
  // Branching — inherited from {@link Database.Database} (`createBranch`/`switchBranch`/
  // `mergeBranch`/`deleteBranch`/`listBranches`/`getCurrentBranch`/`branch`). Client-only extras:
  //

  /** Fires after any branch operation (create / switch / merge / delete) for reactive branch UI. */
  readonly branchesChanged: ReadOnlyEvent<void>;

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

/**
 * A caller-owned, writable **independent instance** of one object bound to one branch (a distinct
 * object instance, not a UI surface).
 * @see Database.BranchBinding
 */
export type BranchBinding<T extends Obj.Unknown = Obj.Unknown> = Database.BranchBinding<T>;

export type EchoDatabaseProps = {
  graph: HypergraphImpl;
  dataService: DataService.Client;
  queryService: QueryService.Client;
  feedService?: FeedService.Client;
  runtime: EffectContext.Context<never>;
  spaceId: SpaceId;

  /** Device-local persistence for the current-branch selection (non-synced). In-memory if omitted. */
  branchStore?: BranchStore;

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
 * Feed block backlog aggregated across all namespaces of a space.
 */
type SpaceFeedSyncState = Pick<Database.SyncState, 'blocksToPull' | 'blocksToPush' | 'totalBlocks'>;

const EMPTY_FEED_SYNC_STATE: SpaceFeedSyncState = { blocksToPull: '0', blocksToPush: '0', totalBlocks: '0' };

/**
 * Sums per-namespace feed block backlog counts into the space-wide totals tracked by
 * {@link SpaceFeedSyncState}. Shared by the one-shot {@link DatabaseImpl.getSyncState} and the
 * streaming {@link DatabaseImpl.subscribeToSyncState}.
 */
const aggregateFeedSyncState = (response: FeedService.GetSyncStateResponse): SpaceFeedSyncState => {
  let blocksToPull = 0n;
  let blocksToPush = 0n;
  let totalBlocks = 0n;
  for (const namespace of response.namespaces ?? []) {
    blocksToPull += BigInt(namespace.blocksToPull);
    blocksToPush += BigInt(namespace.blocksToPush);
    totalBlocks += BigInt(namespace.totalBlocks);
  }
  return {
    blocksToPull: String(blocksToPull),
    blocksToPush: String(blocksToPush),
    totalBlocks: String(totalBlocks),
  };
};

/**
 * Selects the peer to report the automerge backlog against: the explicit `peerId` when given,
 * otherwise the EDGE peer.
 */
const selectPeer = (
  peers: readonly DataService.SpaceSyncState.PeerState[],
  spaceId: SpaceId,
  peerId?: string,
): DataService.SpaceSyncState.PeerState | undefined =>
  peerId !== undefined
    ? peers.find((peer) => peer.peerId === peerId)
    : peers.find((peer) => isEdgePeerId(peer.peerId, spaceId));

/**
 * Flattens per-peer automerge state (for the selected peer) with aggregated feed state.
 */
const combineSyncState = (
  automerge: DataService.SpaceSyncState,
  feeds: SpaceFeedSyncState,
  spaceId: SpaceId,
  peerId?: string,
): Database.SyncState => {
  const peer = selectPeer(automerge.peers ?? [], spaceId, peerId);
  return {
    localDocumentCount: peer?.localDocumentCount ?? 0,
    remoteDocumentCount: peer?.remoteDocumentCount ?? 0,
    totalDocumentCount: peer?.totalDocumentCount ?? 0,
    unsyncedDocumentCount: peer?.unsyncedDocumentCount ?? 0,
    ...feeds,
  };
};

/**
 * The properties `#runObjectMigration` reads/deletes off a migration's `transform` result —
 * `Migration.ObjectMigration.transform` returns `unknown` on the type-erased interface, but its
 * actual shape always matches `Migration.TransformResult<To>`: an `id`/`[MetaId]` envelope around the
 * target type's own data keys (the index signature).
 */
type MigrationOutput = { id?: unknown; [MetaId]?: Partial<ProtocolEntityMeta>; [key: string]: unknown };

/** Whether `value` is an object of exactly version `type`; `Obj.instanceOf` matches any version of a typename. */
const isAtVersion = <S extends Type.AnyObj>(type: S, value: unknown): value is Type.InstanceType<S> => {
  const actual = Obj.instanceOf(type, value) ? Obj.getType(value) : undefined;
  return actual !== undefined && Type.getURI(actual) === Type.getURI(type);
};

/** Every declared type the lenses connect, once each, oldest version first. */
const versionTypesOf = (lenses: readonly VersionLens.VersionLens[]): Type.AnyObj[] =>
  [...new Map(lenses.flatMap((lens) => [lens.from, lens.to]).map((type) => [Type.getURI(type), type])).values()].sort(
    (left, right) =>
      Type.getTypename(left).localeCompare(Type.getTypename(right)) ||
      VersionLens.compareVersions(VersionLens.versionOf(left), VersionLens.versionOf(right)),
  );

/** Idle time after the last update before a watched fold-forward pass, so a burst folds once. */
const FOLD_FORWARD_DEBOUNCE_MS = 2_000;

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
  #feedService: FeedService.Client | undefined;

  /** Runtime used to run effect-rpc feed calls at Promise boundaries. */
  readonly #runtime: EffectContext.Context<never>;

  /**
   * Feed handles keyed by feed URI. A feed is a regular ECHO object whose items live in an
   * EDGE queue addressed by the feed object's URI; this map caches the per-feed client handle.
   */
  readonly #feeds = new Map<EID.EID, FeedHandle>();
  /**
   * Disposals of handles retired by a service swap. A disposal that lost writes is kept until {@link flush} raises it.
   */
  readonly #retiredFeeds = new Set<Promise<void>>();
  /** Serializes migration and fold-forward passes, which read a checkpoint and write it back. */
  readonly #migrationLock = new Mutex();
  readonly #versionSettled: VersionSettled = new Map();
  readonly #versionBindings = new Map<string, Entity.Unknown>();

  constructor(params: EchoDatabaseProps) {
    super();

    this._reactiveSchemaQuery = params.reactiveSchemaQuery ?? true;
    this._preloadSchemaOnOpen = params.preloadSchemaOnOpen ?? true;
    this._hypergraph = params.graph;
    this.#feedService = params.feedService;
    this.#runtime = params.runtime;

    this._entityManager = new EntityManager({
      graph: params.graph,
      dataService: params.dataService,
      queryService: params.queryService,
      runtime: params.runtime,
      spaceId: params.spaceId,
      spaceKey: params.spaceKey,
      branchStore: params.branchStore,
      createEntity: (core) => initEchoReactiveObjectRootProxy(core, this),
    });

    this.saveStateChanged = this._entityManager.saveStateChanged;

    // Effect hashes an unmarked object structurally, walking its prototype chain — on a database
    // that recurses through the whole entity graph and throws on the first strict-mode function it
    // reaches. Identity is the only sensible equality here, and it is what `Atom.family(db)` wants.
    Equal.byReferenceUnsafe(this);
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

  get linksAdded() {
    return this._entityManager.linksAdded;
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
    const disposals = await Promise.allSettled([...this.#feeds.values()].map((feed) => feed.dispose()));
    for (const disposal of disposals) {
      if (disposal.status === 'rejected') {
        log.warn('feed writes lost on close', { err: disposal.reason });
      }
    }
    this.#feeds.clear();
    await Promise.allSettled([...this.#retiredFeeds]);
    this.#retiredFeeds.clear();
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

  private _addPersistentSchema(schemaInput: Schema.Codec<unknown, unknown> | Type.AnyEntity): Type.AnyEntity {
    let schema: Schema.Codec<unknown, unknown>;
    let meta: TypeAnnotation | undefined;
    if (Type.isType(schemaInput)) {
      const entity = schemaInput;
      schema = Type.getSchema(entity).annotate({ [TypeIdentifierAnnotationId]: undefined });
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
      schema.annotate({
        [TypeAnnotationId]: meta,
        [TypeIdentifierAnnotationId]: typeId,
        ...makeTypeJsonSchemaAnnotation({
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
    return this._entityManager.getEntityById(id, { deleted }) as T | undefined;
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
    if (opts?.to) {
      // Synchronous feed append: registers the object as a live feed object and schedules the
      // background write. Returns the same instance; confirm persistence with `db.flush()`.
      this.#getFeedHandle(opts.to).appendSync([obj]);
      return obj;
    }
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
      // `existing` is only known to hold `Type.Type` instances at the type level; the runtime
      // match is for the caller's own `T`, which the query API cannot express generically.
      return match as T;
    }

    // `_addPersistentSchema` reconstructs the entity from a JSON schema at runtime, so its result
    // can only be typed as `Type.AnyEntity`; the caller's `T` is verified by the `Type.isType`
    // invariant inside `_addPersistentSchema`, not by the compiler.
    return this._addPersistentSchema(type) as T;
  }

  private _addObject<T extends Entity.Unknown = Entity.Unknown>(obj: T, opts?: Database.AddOptions): T {
    if (!isEchoObject(obj)) {
      if (!isProxy(obj) && !Entity.isEntity(obj)) {
        throw new TypeError(
          'db.add expects a reactive ECHO object. Plain objects must be created using Obj.make(Type, props).',
        );
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
  _setFeedService(service: FeedService.Client | undefined): void {
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
      this.#runtime,
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
   * Like {@link _getOrCreateFeedHandle}, but returns `undefined` instead of throwing when no feed
   * service is connected. Used by query hydration, which must fall back to a plain (non-live)
   * decode rather than fail the whole query when the feed backend isn't available.
   */
  _getFeedHandleIfAvailable(feedUri: EID.EID, namespace?: string): FeedHandle | undefined {
    if (!this.#feedService) {
      return undefined;
    }
    return this._getOrCreateFeedHandle(feedUri, namespace);
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

  /**
   * Disposes and drops the cached feed handle for a feed (its live working-set / core cache). A
   * subsequent access re-creates a fresh handle that re-reads the feed cold — primarily used by
   * tests to model a spawned process reading the feed with an empty in-memory cache.
   */
  async evictFeedHandle(feed: Feed.Feed): Promise<void> {
    const feedUri = Feed.getFeedUri(feed);
    if (!feedUri) {
      return;
    }
    const handle = this.#feeds.get(feedUri);
    if (handle) {
      this.#feeds.delete(feedUri);
      await handle.dispose();
    }
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

  async createBlobFromUpload(uploadId: string, options?: { storage?: string }): Promise<Blob.Blob> {
    return this.graph.blobManager.createBlobFromUpload(this.spaceId, uploadId, options);
  }

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
    await Promise.all([
      ...[...this.#feeds.values()].map((handle) => handle.waitForPendingWrites()),
      ...[...this.#retiredFeeds].map((disposal) => disposal.finally(() => this.#retiredFeeds.delete(disposal))),
    ]);
  }

  async runMigrations(migrations: Migration.Migration[]): Promise<void> {
    await this.#migrationLock.executeSynchronized(() => this.#runMigrations(migrations));
  }

  async foldForward(migrations: Migration.Migration[], options?: FoldForwardOptions): Promise<void> {
    await this.#migrationLock.executeSynchronized(() => this.#foldForward(migrations, options));
  }

  watchFoldForward(getMigrations: () => Migration.Migration[], options?: { debounceMs?: number }): CleanupFn {
    // Only objects that changed since the last pass can have gained a late write.
    let changed = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pass = () => {
      timer = undefined;
      const objectIds = changed;
      changed = new Set();
      void this.foldForward(getMigrations(), { objectIds }).catch((err) => {
        if (!(err instanceof RpcClosedError)) {
          log.catch(err);
        }
      });
    };
    const unsubscribe = this._entityManager._updateEvent.on((event) => {
      for (const { id } of event.itemsUpdated) {
        changed.add(id);
      }
      clearTimeout(timer);
      timer = setTimeout(pass, options?.debounceMs ?? FOLD_FORWARD_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }

  async syncVersions(lenses: readonly VersionLens.VersionLens[], options?: SyncVersionsOptions): Promise<void> {
    this._entityManager.setKnownVersionTypes(versionTypesOf(lenses).map((type) => Type.getURI(type)));
    await this.#migrationLock.executeSynchronized(async () => {
      const objectIds = options?.objectIds ?? (await this.#versionedObjectIds(lenses));
      await syncVersionDocuments(this, lenses, objectIds, { settled: this.#versionSettled, ...options });
      await this._entityManager.flush();
    });
  }

  async version<S extends Type.AnyObj>(obj: Obj.Unknown, type: S): Promise<Type.InstanceType<S> | undefined> {
    if (isAtVersion(type, obj)) {
      return obj;
    }
    const url = this._entityManager.versionDocumentUrlOfType(obj.id, Type.getURI(type));
    const bound = url && (await this._loadVersionBinding(obj.id, url));
    return isAtVersion(type, bound) ? bound : undefined;
  }

  /**
   * The object bound to its version document `url`, beside the live object, which reads the version it
   * routes to; one per version for the database's lifetime, so every read of that version shares it.
   * @internal
   */
  async _loadVersionBinding(objectId: string, url: AutomergeUrl): Promise<Entity.Unknown> {
    if (this._entityManager.routedDocumentUrl(objectId) === url) {
      const live = await this._loadObjectById(objectId);
      if (live) {
        return live;
      }
    }
    const key = `${objectId} ${url}`;
    const existing = this.#versionBindings.get(key);
    if (existing) {
      return existing;
    }
    const core = await this._entityManager.bindCoreToVersion(objectId, url);
    const object = this.#versionBindings.get(key) ?? initEchoReactiveObjectRootProxy(core, this);
    this.#versionBindings.set(key, object);
    return object;
  }

  watchVersions(getLenses: () => readonly VersionLens.VersionLens[], options?: { debounceMs?: number }): CleanupFn {
    let changed: Set<string> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watched = new Map<DocHandleProxy<DatabaseDirectory>, () => void>();
    const onHandle = (objectId: string, handle: DocHandleProxy<DatabaseDirectory>) => {
      if (!watched.has(handle)) {
        const listener = () => schedule([objectId]);
        handle.on('change', listener);
        watched.set(handle, () => handle.off('change', listener));
      }
    };
    const pass = () => {
      timer = undefined;
      const objectIds = changed;
      changed = new Set();
      void this.syncVersions(getLenses(), { objectIds, onHandle }).catch((err) => {
        if (!(err instanceof RpcClosedError)) {
          log.catch(err);
        }
      });
    };
    const schedule = (objectIds: Iterable<string>) => {
      for (const id of objectIds) {
        changed?.add(id);
      }
      clearTimeout(timer);
      timer = setTimeout(pass, options?.debounceMs ?? FOLD_FORWARD_DEBOUNCE_MS);
    };
    this._entityManager.setKnownVersionTypes(versionTypesOf(getLenses()).map((type) => Type.getURI(type)));
    const unsubscribe = this._entityManager._updateEvent.on((event) => {
      schedule(event.itemsUpdated.map(({ id }) => id));
    });
    // A registry or link change is how a version document another peer created arrives.
    const root = this._getSpaceRootDocHandle();
    const onRootChange = (event: { patches: readonly A.Patch[] }) => {
      schedule(
        event.patches
          .filter(({ path }) => (path[0] === 'branches' || path[0] === 'links') && typeof path[1] === 'string')
          .map(({ path }) => String(path[1])),
      );
    };
    root.on('change', onRootChange);
    // The first pass covers every object.
    schedule([]);
    return () => {
      clearTimeout(timer);
      unsubscribe();
      root.off('change', onRootChange);
      for (const dispose of watched.values()) {
        dispose();
      }
    };
  }

  /** Ids of every object of a type the lenses cover. */
  async #versionedObjectIds(lenses: readonly VersionLens.VersionLens[]): Promise<string[]> {
    const types = versionTypesOf(lenses);
    if (types.length === 0) {
      return [];
    }
    const objects = await this._hypergraph
      .query(Query.select(Filter.or(...types.map((type) => Filter.type(type)))).from(this))
      .run();
    return objects.map((object) => object.id);
  }

  async #runMigrations(migrations: Migration.Migration[]): Promise<void> {
    // Validated up front so a batch containing an unrecognized migration cannot leave the
    // preceding ones half-applied.
    for (const migration of migrations) {
      // Read before the guard, which narrows the failing branch to `never`.
      const kind: string = migration.kind;
      if (!Migration.isMigration(migration)) {
        throw new TypeError(`Unknown migration kind: ${kind}`);
      }
    }

    for (const migration of migrations) {
      if (Migration.isObjectMigration(migration)) {
        await this.#runObjectMigration(migration);
      } else if (Migration.isRenameMigration(migration)) {
        await this.#runRenameMigration(migration);
      } else if (Migration.isFanInMigration(migration)) {
        await runFanInMigration(this, migration);
      } else if (Migration.isArrayFanOutMigration(migration)) {
        await runArrayFanOutMigration(this, migration);
      } else if (Migration.isStampElementIdsMigration(migration)) {
        await runStampElementIdsMigration(this, migration);
      }
    }
    await this.#resumeMigrationEffects(migrations);
    await this._entityManager.flush();

    // A peer may already hold late old-shape writes to objects this run just migrated.
    await this.#foldForward(migrations);
  }

  async #foldForward(migrations: Migration.Migration[], options?: FoldForwardOptions): Promise<void> {
    await foldForwardMigrations(this, migrations, options);
    await this._entityManager.flush();
  }

  async #runObjectMigration(migration: Migration.ObjectMigration): Promise<void> {
    const objects = await this._hypergraph.query(Query.select(Filter.type(migration.fromType)).from(this)).run();
    log.verbose('migrate', {
      from: migration.fromType,
      to: migration.toType,
      objects: objects.length,
    });
    for (const object of objects) {
      // The type query reads the index, which can still list an object an earlier run already
      // migrated; its live type is the authority, so a re-run never migrates an object twice.
      if (Obj.getTypeURI(object)?.toString() !== migration.fromType.toString()) {
        continue;
      }
      // A concurrent migration on another peer can leave the type register behind the steps it recorded;
      // an object that already crossed this step is never migrated through it again.
      if (
        Migration.getMigrationSteps(object).some(
          ({ step }) => step.from === migration.fromType.toString() && step.to === migration.toType.toString(),
        )
      ) {
        continue;
      }

      // Read, transformed and written in one synchronous block, so no replicated change can land
      // between the snapshot the output derives from and the heads the migration change records.
      const core = getObjectCore(object);
      const before = { ...getDecodedDataWithRefs(this, core, A.getHeads(core.getDoc())), id: object.id };
      const result = migration.transform(before);
      if (result instanceof Promise) {
        result.catch((err: unknown) => log.catch(err));
        throw new TypeError(
          `Migration ${migration.fromType.toString()} -> ${migration.toType.toString()}: transform must be synchronous`,
        );
      }
      const output = result as MigrationOutput | undefined;
      const metaPatch = output?.[MetaId];
      if (metaPatch !== undefined && output != null) {
        delete output[MetaId];
      }

      delete output?.id;

      // An old client keeps writing a kept key in its old meaning, straight into the new field, where
      // fold-forward cannot tell the two apart; a changed meaning needs a new name.
      const reinterpreted = [...computeGuardedDataWrites(core, output ?? {}).keys()].filter(
        (key) => core.getRaw([DATA_NAMESPACE, key]) !== undefined,
      );
      if (reinterpreted.length > 0) {
        throw new Error(
          `Migration ${migration.fromType.toString()} -> ${migration.toType.toString()}: transform changes the value of kept properties [${reinterpreted.join(', ')}] on object ${object.id}; write a changed value under a new property name`,
        );
      }

      // An overlay value lives in the object's meta, which the data-only transform input omits.
      if (migration.lens && output) {
        const overlays = Lens.getOverlays(object, migration.lens.id);
        for (const property of Lens.coverage(migration.lens).overlaid) {
          if (output[property] === undefined && overlays[property] !== undefined) {
            output[property] = overlays[property];
          }
        }
      }

      // Whole-set validation before any write lands: an invalid transform must not half-write the
      // object. `toSchema` is the target's entity schema (it requires `id`, which the transform
      // contract omits), so the object's own — unchanging — id stands in for it here.
      try {
        Schema.asserts(migration.toSchema, { ...output, id: object.id });
      } catch (cause) {
        throw new Error(
          `Migration ${migration.fromType.toString()} -> ${migration.toType.toString()}: invalid transform output for object ${object.id}`,
          { cause },
        );
      }

      const stepKey = this.#applyObjectMigration(object, migration, output ?? {}, metaPatch);
      const postMigrationType = Obj.getTypeURI(object);
      invariant(postMigrationType != null && postMigrationType.toString() === migration.toType.toString());

      await this.#runMigrationEffects(object, migration, stepKey, before);
    }
  }

  /** Runs `onMigration` for one migrated object, then clears its step's `effectsPending` flag. */
  async #runMigrationEffects(
    object: Obj.Unknown,
    migration: Migration.ObjectMigration,
    stepKey: string,
    before: Record<string, unknown> & { id: string },
  ): Promise<void> {
    if (!migration.onMigration) {
      return;
    }
    await migration.onMigration({ ...createObjectMigrationContext(this), before, object });
    const core = getObjectCore(object);
    core.change((doc) => {
      setDeep(doc, [...core.mountPath, META_NAMESPACE, 'annotations', stepKey, 'effectsPending'], false);
    });
  }

  /**
   * Re-runs `onMigration` for every recorded step whose migration change landed but whose effects never
   * completed, found by its step rather than by type, since a later migration may have moved it on.
   */
  async #resumeMigrationEffects(migrations: readonly Migration.Migration[]): Promise<void> {
    const withEffects = migrations.filter(
      (migration): migration is Migration.ObjectMigration =>
        Migration.isObjectMigration(migration) && migration.onMigration !== undefined,
    );
    if (withEffects.length === 0) {
      return;
    }
    const objects = await this._hypergraph.query(Query.select(Filter.everything()).from(this)).run();
    for (const object of objects) {
      const core = getObjectCore(object);
      for (const { key, step } of Migration.getMigrationSteps(object)) {
        const migration = withEffects.find(
          (candidate) => candidate.fromType.toString() === step.from && candidate.toType.toString() === step.to,
        );
        if (migration && step.effectsPending && A.hasHeads(core.getDoc(), [...step.preHeads])) {
          const before = { ...getDecodedDataWithRefs(this, core, [...step.preHeads]), id: object.id };
          await this.#runMigrationEffects(object, migration, key, before);
        }
      }
    }
  }

  /**
   * Applies one object migration's write set in a single automerge change on the object's own
   * `ObjectCore`: data keys the transform's output actually changed (value-compare guarded — an
   * unchanged key emits no op, and a key the output omits is left untouched as a retired property),
   * the meta patch (merged key by key, same guard), the type switch, and a new
   * {@link Migration.MigrationStep} under its own annotation key (post-step heads are this very
   * change, locatable by its `message`) — the object's PREVIOUS steps are kept: a `@1 -> @2 -> @3`
   * object carries both, so fold-forward can still find a late `@1`-shaped write against step one.
   *
   * @returns The annotation key the step was recorded under.
   *
   * Every `ObjectCore` helper (`setDecoded`, `setType`, ...) opens its own `change`, so nesting them
   * here would produce several changes; every write below instead goes straight onto the doc at
   * `core.mountPath`, inside one `core.sharedChangeAt` call.
   */
  #applyObjectMigration(
    object: Obj.Unknown,
    migration: Migration.ObjectMigration,
    output: MigrationOutput,
    metaPatch: Partial<ProtocolEntityMeta> | undefined,
  ): string {
    const core = getObjectCore(object);
    const mountPath = core.mountPath;
    const preHeads = A.getHeads(core.getDoc());

    const dataWrites = computeGuardedDataWrites(core, output);

    const metaWrites = new Map<string, unknown>();
    for (const [key, value] of Object.entries(metaPatch ?? {})) {
      if (value === undefined) {
        continue;
      }
      const encoded = core.encode(value);
      if (!encodedValuesEqual(encoded, core.getRaw([META_NAMESPACE, key]))) {
        metaWrites.set(key, encoded);
      }
    }

    const fromType = migration.fromType.toString();
    const toType = migration.toType.toString();
    const index = Migration.getMigrationSteps(object).length;
    const newStep = core.encode(
      Schema.encodeSync(Migration.MigrationStepSchema)({
        index,
        from: fromType,
        to: toType,
        preHeads: [...preHeads],
        // Every source property the output drops, set or not: an optional one an old client sets for
        // the first time after the migration is still a late write to fold.
        retired: [
          ...new Set([
            ...SchemaEx.getProperties(migration.fromSchema.ast).map((property) => String(property.name)),
            ...Object.keys(core.getRaw([DATA_NAMESPACE]) ?? {}),
          ]),
        ]
          .filter((key) => key !== 'id' && !Object.hasOwn(output, key))
          .sort(),
        ...(migration.onMigration ? { effectsPending: true } : {}),
      }),
    );
    // Derived from what identifies the step, so two peers recording the same step write the same key.
    const stepKey = `${Migration.MIGRATION_STEP_KEY_PREFIX}${bytesToHex(
      sha256(utf8ToBytes(`${fromType}|${toType}|${[...preHeads].sort().join(',')}`)),
    ).slice(0, 32)}`;
    const typeRef = EncodedReference.fromURI(migration.toType);

    // Authored identically by every peer that migrates from the same heads, so they share one change
    // and one set of target containers, and a direct edit inside them made on either peer survives.
    core.sharedChangeAt(
      preHeads,
      (draft, mountPath) => {
        for (const [key, value] of dataWrites) {
          setDeep(draft, [...mountPath, DATA_NAMESPACE, key], value);
        }
        for (const [key, value] of metaWrites) {
          setDeep(draft, [...mountPath, META_NAMESPACE, key], value);
        }

        setDeep(draft, [...mountPath, META_NAMESPACE, 'annotations', stepKey], newStep);
        setDeep(draft, [...mountPath, SYSTEM_NAMESPACE, 'type'], typeRef);
      },
      { message: `migration: ${fromType} -> ${toType}`, actorSeed: stepKey },
    );
    return stepKey;
  }

  /**
   * Repoints every reference to the renamed entity at its new name.
   */
  async #runRenameMigration(migration: Migration.RenameMigration): Promise<void> {
    const fromName = DXN.getName(migration.from);
    const toName = DXN.getName(migration.to);

    // Undefined when the URI already reads correctly, so a re-run writes nothing.
    const rewrite = (uri: URI.URI): URI.URI | undefined => {
      if (!DXN.isDXN(uri) || DXN.getName(uri) !== fromName) {
        return undefined;
      }
      const rewritten = DXN.make<string>(toName, DXN.getVersion(uri));
      return rewritten === uri ? undefined : rewritten;
    };

    // The planner collapses this to one reverse-reference index lookup: the renamed entity is not in
    // the graph, so its anchor cannot be selected.
    const objects = await this._hypergraph.query(Query.select(Filter.key(fromName)).referencedBy().from(this)).run();

    let updated = 0;
    for (const object of objects) {
      const core = getObjectCore(object);
      const updates: { path: string[]; uri: URI.URI }[] = [];
      const visit = (path: string[], value: unknown): void => {
        if (EncodedReference.isEncodedReference(value)) {
          const uri = rewrite(EncodedReference.toURI(value));
          if (uri !== undefined) {
            updates.push({ path, uri });
          }
        } else if (Array.isArray(value)) {
          value.forEach((entry, index) => visit([...path, String(index)], entry));
        } else if (typeof value === 'object' && value !== null) {
          for (const [key, entry] of Object.entries(value)) {
            visit([...path, key], entry);
          }
        }
      };
      visit([], core.getDecoded([DATA_NAMESPACE]));

      for (const { path, uri } of updates) {
        core.setDecoded([DATA_NAMESPACE, ...path], EncodedReference.fromURI(uri));
      }
      updated += updates.length;
    }

    log.verbose('rename', { from: migration.from, to: migration.to, objects: objects.length, references: updated });
  }

  getAutomergeSyncState(): Promise<DataService.SpaceSyncState> {
    return this._entityManager.getSyncState();
  }

  subscribeToAutomergeSyncState(ctx: Context, callback: (state: DataService.SpaceSyncState) => void): CleanupFn {
    return this._entityManager.subscribeToSyncState(ctx, callback);
  }

  async getSyncState(options?: Database.GetSyncStateOptions): Promise<Database.SyncState> {
    const [automerge, feeds] = await Promise.all([this._entityManager.getSyncState(), this.#getSpaceFeedSyncState()]);
    return combineSyncState(automerge, feeds, this.spaceId, options?.peerId);
  }

  subscribeToSyncState(cb: (state: Database.SyncState) => void, options?: Database.GetSyncStateOptions): CleanupFn {
    const ctx = Context.default();
    let automerge: DataService.SpaceSyncState = { peers: [] };
    let feeds: SpaceFeedSyncState = EMPTY_FEED_SYNC_STATE;
    const emit = () => cb(combineSyncState(automerge, feeds, this.spaceId, options?.peerId));

    // Automerge documents arrive as a stream.
    ctx.onDispose(
      this._entityManager.subscribeToSyncState(ctx, (state) => {
        automerge = state;
        emit();
      }),
    );

    // Feed blocks arrive on a separate stream, which dies on reconnect (leader change) — re-established
    // from the refreshed service, and cleared meanwhile so a consumer never keeps reporting a backlog
    // measured against a connection that no longer exists.
    let cleanupFeedStream: (() => void) | undefined;
    const subscribeFeedSyncState = () => {
      cleanupFeedStream?.();
      cleanupFeedStream = undefined;
      if (!this.#feedService) {
        return;
      }
      cleanupFeedStream = subscribeStream(
        this.#runtime,
        this.#feedService['FeedService.subscribeSyncState']({ spaceId: this.spaceId, namespaces: [] }),
        {
          onData: (response) => {
            feeds = aggregateFeedSyncState(response);
            emit();
          },
          onError: (error) => {
            feeds = EMPTY_FEED_SYNC_STATE;
            emit();
            if (error instanceof RpcClosedError) {
              ctx.onDispose(this._entityManager.reconnected.once(() => subscribeFeedSyncState()));
            } else if (error) {
              log.warn('feed sync state stream failed', { error });
            }
          },
        },
      );
    };

    subscribeFeedSyncState();
    ctx.onDispose(() => cleanupFeedStream?.());

    return () => {
      void ctx.dispose();
    };
  }

  /**
   * Aggregates feed block backlog across all namespaces synced for this space.
   */
  async #getSpaceFeedSyncState(): Promise<SpaceFeedSyncState> {
    if (!this.#feedService) {
      return EMPTY_FEED_SYNC_STATE;
    }
    const response = await runServiceCall(
      this.#runtime,
      this.#feedService['FeedService.getSyncState']({ spaceId: this.spaceId, namespaces: [] }),
    );
    return aggregateFeedSyncState(response);
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

  getLoadedDocumentHandles(): DocHandleProxy<unknown>[] {
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

  get branchesChanged(): ReadOnlyEvent<void> {
    return this._entityManager.branchesChanged;
  }

  getCurrentBranch(objectId: string): string {
    return this._entityManager.getCurrentBranch(objectId);
  }

  getVersion<T extends Obj.Unknown>(obj: T, heads: readonly string[]): Obj.Snapshot<T> {
    return checkoutVersionSnapshot(obj, [...heads]);
  }

  getChanges<T extends Obj.Unknown>(obj: T, opts?: Obj.GetChangesOptions): Change.ValueChange<unknown>[] {
    return getObjectChanges(obj, opts);
  }

  getConflict<T extends Obj.Unknown>(obj: T, property: string): Obj.Conflict | undefined {
    return getObjectConflict(obj, property);
  }

  listBranches(objectId: string): string[] {
    return this._entityManager.listBranches(objectId);
  }

  createBranch(
    rootObjectId: string,
    name: string,
    opts?: { fromHeads?: Heads | Record<string, Heads> },
  ): Promise<void> {
    return this._entityManager.createBranch(rootObjectId, name, opts);
  }

  switchBranch(rootObjectId: string, name: string): Promise<void> {
    return this._entityManager.switchBranch(rootObjectId, name);
  }

  mergeBranch(rootObjectId: string, name: string, opts?: { deleteAfter?: boolean }): Promise<void> {
    return this._entityManager.mergeBranch(rootObjectId, name, opts);
  }

  syncBranch(rootObjectId: string, name: string): Promise<void> {
    return this._entityManager.syncBranch(rootObjectId, name);
  }

  deleteBranch(rootObjectId: string, name: string): void {
    this._entityManager.deleteBranch(rootObjectId, name);
  }

  async branch<T extends Obj.Unknown>(obj: T, name: string): Promise<BranchBinding<T>> {
    assertArgument(isEchoObject(obj), 'obj', 'expected ECHO object stored in the database');
    // Guard against foreign/unbound objects: 'main' would hand back an unrelated live object as a
    // valid binding, and other branches resolve by id only (an id collision could bind another
    // space's data).
    assertArgument(getObjectCore(obj).database === this, 'obj', 'object is not bound to this database');
    if (name === 'main') {
      // The live object IS the main binding; nothing to release.
      return { object: obj, dispose: () => {} };
    }
    const { core, dispose } = await this._entityManager.bindCoreToBranch(getObjectCore(obj).id, name);
    const object = initEchoReactiveObjectRootProxy(core, this) as T;
    return { object, dispose };
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

  allObjectCores() {
    return this._entityManager.allObjectCores();
  }

  areStrongDepsSatisfied(core: Parameters<EntityManager['areStrongDepsSatisfied']>[0]) {
    return this._entityManager.areStrongDepsSatisfied(core);
  }

  areStrongDepsResolved(core: Parameters<EntityManager['areStrongDepsResolved']>[0]) {
    return this._entityManager.areStrongDepsResolved(core);
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

  async stats(): Promise<Database.DatabaseStats> {
    const { loaded: host, ...stored } = await this._entityManager.stats();
    return { ...stored, loaded: { client: this.#clientLoadedStats(), host } };
  }

  /** Residency of this database's own caches — synchronous, so it samples one moment. */
  #clientLoadedStats(): Database.ClientLoadedStats {
    let feedObjects = 0;
    for (const handle of this.#feeds.values()) {
      feedObjects += handle.residentObjectCount;
    }

    const { documents, objects } = this._entityManager.loadedStats();
    return {
      documents,
      objects,
      feeds: this.#feeds.size,
      feedObjects,
      registryTotal: this.registry.local.length,
    };
  }

  async runGarbageCollection(options?: Database.GarbageCollectionOptions): Promise<Database.GarbageCollectionReport> {
    return this._entityManager.runGarbageCollection(options);
  }

  retainObjects(keep: Iterable<string>): string[] {
    return this._entityManager.retainObjects(keep);
  }

  /**
   * Update service references after reconnection.
   */
  _updateServices({
    dataService,
    queryService,
    feedService,
  }: {
    dataService: DataService.Client;
    queryService: QueryService.Client;
    feedService?: FeedService.Client;
  }): void {
    this._entityManager._updateServices({ dataService, queryService });
    if (feedService !== undefined && feedService !== this.#feedService) {
      const stale = [...this.#feeds.values()];
      this.#feeds.clear();
      for (const handle of stale) {
        // Tracked because `dispose` drains pending writes: dropping the handle from `#feeds` alone would let `flush()`
        // resolve while that drain is still running, or after it lost the writes.
        const disposal = handle.dispose().then(() => {
          this.#retiredFeeds.delete(disposal);
        });
        disposal.catch((err) => log.warn('retired feed handle lost writes', { err }));
        this.#retiredFeeds.add(disposal);
      }
      this.#feedService = feedService;
    }
  }

  async _onReconnect(): Promise<void> {
    await this._entityManager._onReconnect();
  }

  /**
   * @internal
   */
  async _loadObjectById(objectId: string, options: LoadObjectOptions = {}): Promise<Entity.Unknown | undefined> {
    return this._entityManager.loadEntityById(objectId, options);
  }

  // ── Deprecated API ───────────────────────────────────────────────────────

  /** @deprecated */
  readonly pendingBatch = new Event<unknown>();
}

// TODO(burdon): Create APIError class.
const createSchemaNotRegisteredError = (schema?: Type.AnyEntity) => {
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
