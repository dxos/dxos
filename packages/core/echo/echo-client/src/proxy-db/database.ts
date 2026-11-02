//
// Copyright 2022 DXOS.org
//

import { type Heads } from '@automerge/automerge';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Equal from 'effect/Equal';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { inspect } from 'node:util';

import { type CleanupFn, Event, type ReadOnlyEvent, synchronized } from '@dxos/async';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { inspectObject } from '@dxos/debug';
import {
  Annotation,
  type Blob,
  type Change,
  Database,
  Entity,
  Feed,
  Filter,
  JsonSchema,
  Migration,
  Obj,
  Query,
  QueryAST,
  Ref,
  type Registry,
  Relation,
  Type,
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
import * as EffectEx from '@dxos/effect/EffectEx';
import { assertArgument, assertState, invariant } from '@dxos/invariant';
import { DXN, EID, EntityId, type PublicKey, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError, runServiceCall, subscribeStream } from '@dxos/protocols';
import { type DataService, type FeedService, type QueryService } from '@dxos/protocols/rpc';
import { type EventAttributes, trace } from '@dxos/tracing';

import type { SaveStateChangedEvent } from '../automerge/index.ts';
import { type DocHandleProxy, type RepoProxy } from '../automerge/index.ts';
import {
  type BranchStore,
  type DocumentRetention,
  EntityManager,
  type ExportWorkingSetOptions,
  type LoadObjectOptions,
  type SpaceDocumentHeads,
  type WorkingSetRow,
} from '../core-db/index.ts';
import {
  EchoReactiveHandler,
  type ProxyTarget,
  checkoutVersionSnapshot,
  createObject,
  getObjectChanges,
  getObjectCore,
  initEchoReactiveObjectRootProxy,
  isEchoObject,
} from '../echo-handler/index.ts';
import { FeedHandle } from '../feed/feed-handle.ts';
import { type HypergraphImpl } from '../hypergraph.ts';

export interface EchoDatabase extends Database.Database {
  /**
   * Get notification about the data being saved to disk.
   */
  readonly saveStateChanged: ReadOnlyEvent<SaveStateChangedEvent>;

  /** Whether a change exists only in this client, so losing the page would lose it. Synchronous, for `beforeunload`. */
  hasUnsavedChanges(): boolean;

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
   * Get the current per-peer automerge document sync state.
   */
  getAutomergeSyncState(): Promise<DataService.SpaceSyncState>;

  /**
   * Get notification about the per-peer automerge document sync progress.
   */
  subscribeToAutomergeSyncState(ctx: Context, callback: (state: DataService.SpaceSyncState) => void): CleanupFn;

  /**
   * Get the local heads of the space root document and every document it links.
   */
  getDocumentHeads(): Promise<SpaceDocumentHeads>;

  /**
   * Returns ids for all objects in the space (both loaded and unloaded).
   */
  getAllObjectIds(): string[];

  /**
   * Returns the number of objects stored inline in the space root document.
   *
   * @deprecated Inline directory objects are migrated into linked documents; this counts the ones not migrated yet.
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
  removeFeedItemsByIds(
    feed: Feed.Feed,
    ids: string[],
    options?: { branches?: ReadonlyArray<string | null> },
  ): Promise<void>;

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

  /** Which loaded object documents the database keeps in memory. */
  documentRetention?: DocumentRetention;

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

  /** Starts a new space epoch whose root is the given document; enables `beginMigration({ root: 'replace' })`. */
  createEpoch?: (rootUrl: string) => Promise<void>;
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
 * `Migration.ObjectMigration.transform` is declared as `(from: unknown, ...) => Promise<unknown>`
 * on the type-erased interface, but its actual shape always matches `Migration.TransformResult<To>`.
 */
type MigrationOutput = { id?: unknown; [MetaId]?: Partial<ProtocolEntityMeta> };

/** Structural equality of plain JSON data, independent of key order. */
const isJsonEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => isJsonEqual(value, right[index]))
    );
  }
  if (isPlainRecord(left) && isPlainRecord(right)) {
    const keys = Object.keys(left);
    return (
      keys.length === Object.keys(right).length &&
      keys.every((key) => key in right && isJsonEqual(left[key], right[key]))
    );
  }
  return false;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Writes a migrated content field: a record field key by key, so concurrent edits to other records
 * survive the merge; any other field whole, and only when it changed.
 */
const writeContentField = (target: object, field: string, before: unknown, after: unknown, record: boolean): void => {
  if (after === undefined) {
    if (before !== undefined) {
      Reflect.deleteProperty(target, field);
    }
    return;
  }
  const current: unknown = Reflect.get(target, field);
  if (!record || !isPlainRecord(after) || !isPlainRecord(before) || !isPlainRecord(current)) {
    if (!isJsonEqual(before, after)) {
      Reflect.set(target, field, after);
    }
    return;
  }
  for (const key of Object.keys(before)) {
    if (!(key in after)) {
      Reflect.deleteProperty(current, key);
    }
  }
  for (const [key, value] of Object.entries(after)) {
    if (!isJsonEqual(before[key], value)) {
      Reflect.set(current, key, value);
    }
  }
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
  #seed?: readonly WorkingSetRow[];

  /**
   * Backend for feed operations. Set on construction and refreshed on reconnect.
   */
  #feedService: FeedService.Client | undefined;

  /** Runtime used to run effect-rpc feed calls at Promise boundaries. */
  readonly #runtime: EffectContext.Context<never>;
  readonly #createEpoch?: (rootUrl: string) => Promise<void>;

  /**
   * Feed handles keyed by feed URI. A feed is a regular ECHO object whose items live in an
   * EDGE queue addressed by the feed object's URI; this map caches the per-feed client handle.
   */
  readonly #feeds = new Map<EID.EID, FeedHandle>();
  /**
   * Disposals of handles retired by a service swap. A disposal that lost writes is kept until {@link flush} raises it.
   */
  readonly #retiredFeeds = new Set<Promise<void>>();

  constructor(params: EchoDatabaseProps) {
    super();

    this._reactiveSchemaQuery = params.reactiveSchemaQuery ?? true;
    this._preloadSchemaOnOpen = params.preloadSchemaOnOpen ?? true;
    this._hypergraph = params.graph;
    this.#feedService = params.feedService;
    this.#runtime = params.runtime;
    this.#createEpoch = params.createEpoch;

    this._entityManager = new EntityManager({
      graph: params.graph,
      dataService: params.dataService,
      queryService: params.queryService,
      runtime: params.runtime,
      spaceId: params.spaceId,
      spaceKey: params.spaceKey,
      branchStore: params.branchStore,
      documentRetention: params.documentRetention,
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

  get _localCommitEvent() {
    return this._entityManager._localCommitEvent;
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

    const seed = this.#seed;
    this.#seed = undefined;
    if (seed) {
      this._entityManager.seedDocuments(seed);
    }

    if (this._rootUrl !== undefined) {
      await this._entityManager.openWithSpaceState(this._ctx, { rootUrl: this._rootUrl });
      if (seed) {
        this._entityManager.placeSeededObjects(seed);
      }
    }

    if (this._preloadSchemaOnOpen) {
      const preload = this.query(Filter.type(PersistentSchema))
        .run()
        .catch((err) => log.warn('schema preload failed', { spaceId: this.spaceId, err }));
      // A seeded open is usable from its seed; the preload's answer comes from the host, which may still be starting.
      if (!seed) {
        await preload;
      }
    }

    if (this._reactiveSchemaQuery) {
      const unsubscribe = this.query(Filter.type(PersistentSchema)).subscribe(() => {});
      this._ctx.onDispose(unsubscribe);
    }
  }

  @synchronized
  protected override async _close(ctx: Context): Promise<void> {
    const disposals = await Promise.allSettled([...this.#feeds.values()].map((feed) => feed.dispose()));
    for (const disposal of disposals) {
      if (disposal.status === 'rejected') {
        log.warn('feed writes lost on close', { err: disposal.reason });
      }
    }
    this.#feeds.clear();
    await Promise.allSettled([...this.#retiredFeeds]);
    this.#retiredFeeds.clear();
    await this._entityManager.close(ctx);
  }

  // ── Working set persistence ─────────────────────────────────────────────

  /**
   * Rows the next {@link open} shows and edits the working set from, before the host delivers anything;
   * the host's later updates bring them current.
   */
  seedWorkingSet(rows: readonly WorkingSetRow[]): void {
    assertState(this._lifecycleState !== LifecycleState.OPEN, 'Seed the working set before the database opens.');
    this.#seed = rows;
  }

  /** The working set as rows to {@link seedWorkingSet} a later session with; empty until the space root is loaded. */
  exportWorkingSet(options: ExportWorkingSetOptions): WorkingSetRow[] {
    return this._lifecycleState === LifecycleState.OPEN ? this._entityManager.exportWorkingSet(options) : [];
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

  private _addPersistentSchema(
    schemaInput: Schema.Codec<unknown, unknown> | Type.AnyEntity,
    origin?: Database.Origin,
  ): Type.AnyEntity {
    let schema: Schema.Codec<unknown, unknown>;
    let meta: TypeAnnotation | undefined;
    if (Type.isType(schemaInput)) {
      const entity = schemaInput;
      schema = Type.getSchema(entity).annotate({ [TypeIdentifierAnnotationId]: undefined });
      meta = getTypeAnnotation(schema) ?? this.#describedTypeAnnotation(entity);
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
          relationSource: meta.sourceSchema,
          relationTarget: meta.targetSchema,
        }),
      }),
    );

    const persistentSchema = this._addObject(schemaToStore, { origin });
    invariant(Type.isType(persistentSchema), 'persisted schema must materialize as a Type entity (kind=type)');
    return persistentSchema;
  }

  /**
   * The annotation of a type entity built from JSON Schema, whose rebuilt schema carries none because
   * its typename and version live in meta; the kind and relation ends come from the JSON Schema.
   */
  #describedTypeAnnotation(entity: Type.AnyEntity): TypeAnnotation {
    const { entityKind, relationSource, relationTarget } = entity.jsonSchema;
    const isRelation = Type.isRelation(entity) || entityKind === EntityKind.Relation;
    return {
      kind: isRelation ? EntityKind.Relation : EntityKind.Object,
      typename: Type.getTypename(entity),
      version: Type.getVersion(entity),
      ...(isRelation && {
        sourceSchema: this.#relationEndDXN(relationSource?.$ref),
        targetSchema: this.#relationEndDXN(relationTarget?.$ref),
      }),
    };
  }

  /**
   * A relation end as the `dxn:` the stored annotation requires; an end naming a type persisted in
   * this space by its `echo:` id is recorded under that type's typename and version.
   */
  #relationEndDXN(uri: string | undefined): DXN.DXN | undefined {
    if (uri == null || !EID.isEID(uri)) {
      return uri == null ? undefined : DXN.tryMake(uri);
    }
    const entityId = EID.getEntityId(EID.parse(uri));
    const type = entityId ? this._entityManager.getEntityById(entityId) : undefined;
    if (!Type.isType(type)) {
      return undefined;
    }
    return DXN.tryMake(`dxn:${Type.getTypename(type)}:${Type.getMeta(type).version}`);
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
      this.#emitFeedAppend(opts.to, [obj], opts.origin);
      return obj;
    }
    return this._addObject(obj, opts);
  }

  /**
   * Persist a Type definition (clones/forks the entity) so it replicates to other peers.
   */
  async addType<T extends Type.AnyEntity>(type: T, opts?: Database.WriteOptions): Promise<T> {
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
    const persisted = this._addPersistentSchema(type, opts?.origin) as T;
    trace.events.emit(Database.TraceEvents.typeAdd, {
      spaceId: this.spaceId,
      typename,
      version,
      origin: opts?.origin ?? 'unknown',
    });
    return persisted;
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

    // An object already bound to a database is being restored, not created.
    const created = getObjectCore(obj).entityManager == null;
    const target = getProxyTarget(obj) as ProxyTarget & Entity.Unknown;
    EchoReactiveHandler.instance.setDatabase(target, this);
    // Re-stamp relation endpoints now that the database (and thus space) is known: cross-space
    // endpoints become absolute, same-space relative, and unpersisted endpoints are added here.
    EchoReactiveHandler.instance.rebindRelationEndpoints(target);
    EchoReactiveHandler.instance.saveRefs(target);
    this._entityManager.addCore(getObjectCore(obj));
    if (created) {
      trace.events.emit(Database.TraceEvents.objectAdd, this.#entityAttributes(obj, opts?.origin));
    }
    return obj;
  }

  remove<T extends Entity.Unknown = Entity.Unknown>(obj: T, opts?: Database.WriteOptions): void {
    assertArgument(isEchoObject(obj), 'obj');
    this._entityManager.removeCore(getObjectCore(obj));
    trace.events.emit(Database.TraceEvents.objectRemove, this.#entityAttributes(obj, opts?.origin));
  }

  /** What ECHO's trace events report about a written entity. */
  #entityAttributes(entity: Entity.Unknown, origin?: Database.Origin): EventAttributes {
    const type = Entity.getType(entity);
    return {
      spaceId: this.spaceId,
      objectId: entity.id,
      typename: Entity.getTypename(entity),
      relation: Relation.isRelation(entity),
      userType: type != null && isUserFacing(type),
      origin: resolveOrigin(entity, origin),
    };
  }

  #emitFeedAppend(feed: Feed.Feed, entities: Entity.Unknown[], origin?: Database.Origin): void {
    for (const entity of entities) {
      trace.events.emit(Database.TraceEvents.feedAppend, {
        ...this.#entityAttributes(entity, origin),
        feedId: feed.id,
      });
    }
  }

  //
  // Feeds.
  //

  async appendToFeed(feed: Feed.Feed, entities: Entity.Unknown[], opts?: Database.WriteOptions): Promise<void> {
    await this.#getFeedHandle(feed).append(entities);
    this.#emitFeedAppend(feed, entities, opts?.origin);
  }

  async forkFeed(
    feed: Feed.Feed,
    base: Entity.Unknown,
    opts: { at: Entity.Unknown | Entity.Snapshot | Feed.BlockId },
  ): Promise<Feed.BranchId> {
    const handle = this.#getFeedHandle(feed);
    const at = typeof opts.at === 'string' ? opts.at : handle.blockIdOf(opts.at);
    invariant(at !== undefined, 'fork: the fork point has no block yet; flush it first');
    const branch = Feed.BranchId.make(await handle.fork(base, at));
    this.#emitFeedAppend(feed, [base], undefined);
    return branch;
  }

  async deleteFromFeed(feed: Feed.Feed, entities: Entity.Unknown[]): Promise<void> {
    await this.removeFeedItemsByIds(
      feed,
      entities.map((entity) => entity.id),
      { branches: entities.map((entity) => Feed.getBranch(entity) ?? null) },
    );
  }

  async removeFeedItemsByIds(
    feed: Feed.Feed,
    ids: string[],
    options?: { branches?: ReadonlyArray<string | null> },
  ): Promise<void> {
    await this.#getFeedHandle(feed).delete(ids, options?.branches);
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
    this._feedHandleCreated.emit(handle);
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
   * @internal
   * Fires when a feed handle is instantiated, so a live query over all feeds can watch a feed first written
   * after it started.
   */
  readonly _feedHandleCreated = new Event<FeedHandle>();

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

  hasUnsavedChanges(): boolean {
    return (
      this._entityManager.hasUnsavedChanges() ||
      this.#retiredFeeds.size > 0 ||
      [...this.#feeds.values()].some((handle) => handle.hasPendingWrites())
    );
  }

  async flush(opts?: Database.FlushOptions): Promise<void> {
    await this._entityManager.flush(opts);
    await Promise.all([
      ...[...this.#feeds.values()].map((handle) => handle.waitForPendingWrites()),
      ...[...this.#retiredFeeds].map((disposal) => disposal.finally(() => this.#retiredFeeds.delete(disposal))),
    ]);
  }

  async runMigrations(migrations: Migration.Migration[]): Promise<void> {
    // Validated up front so a batch containing an unrecognized migration cannot leave the
    // preceding ones half-applied.
    for (const migration of migrations) {
      // Read before the guard, which narrows the failing branch to `never`.
      const kind: string = migration.kind;
      if (!Migration.isMigration(migration)) {
        throw new TypeError(`Unknown migration kind: ${kind}`);
      }
    }

    const contentTypes = new Set<URI.URI>();
    for (const migration of migrations) {
      if (Migration.isObjectMigration(migration)) {
        await this.#runObjectMigration(migration);
      } else if (Migration.isRenameMigration(migration)) {
        await this.#runRenameMigration(migration);
      } else if (Migration.isContentMigration(migration)) {
        contentTypes.add(migration.type);
      } else if (Migration.isTransactionMigration(migration)) {
        const transaction = await this.beginMigration(migration.options);
        await EffectEx.runPromise(migration.run(transaction, { db: this }).pipe(Effect.andThen(transaction.commit())));
      }
    }
    // Content steps run per type, after object migrations have moved objects onto the types they name.
    for (const type of contentTypes) {
      await this.#runContentMigrations(type, Migration.getContentSteps(migrations, type));
    }
    await this._entityManager.flush();
  }

  /**
   * Upgrades the content of every object of `type` whose version starts a chain of `steps`, writing
   * only the changed records and the new version in one change.
   */
  async #runContentMigrations(type: URI.URI, steps: ReadonlyMap<string, Migration.ContentMigration>): Promise<void> {
    const [first] = steps.values();
    if (!first) {
      return;
    }
    const { versionField, fields, recordFields } = first;
    const objects = await this._hypergraph.query(Query.select(Filter.type(type)).from(this)).run();
    let migrated = 0;
    for (const object of objects) {
      const version: unknown = Reflect.get(object, versionField);
      if (typeof version !== 'string' || !steps.has(version)) {
        continue;
      }
      const before: Record<string, unknown> = {};
      for (const field of fields) {
        const value: unknown = Reflect.get(object, field);
        if (value !== undefined) {
          before[field] = JSON.parse(JSON.stringify(value));
        }
      }
      // A separate copy, so a transform that edits its input in place still diffs against the stored data.
      const upgraded = Migration.applyContentSteps(steps, version, JSON.parse(JSON.stringify(before)));
      Obj.update(object, (object) => {
        for (const field of fields) {
          writeContentField(object, field, before[field], upgraded.content[field], recordFields.includes(field));
        }
        Reflect.set(object, versionField, upgraded.version);
      });
      migrated++;
    }
    log.verbose('migrate content', { type, objects: objects.length, migrated });
  }

  async #runObjectMigration(migration: Migration.ObjectMigration): Promise<void> {
    const objects = await this._hypergraph.query(Query.select(Filter.type(migration.fromType)).from(this)).run();
    log.verbose('migrate', {
      from: migration.fromType,
      to: migration.toType,
      objects: objects.length,
    });
    for (const object of objects) {
      const before = JSON.parse(JSON.stringify(object));

      const output = (await migration.transform(object, { db: this })) as MigrationOutput | undefined;
      const metaPatch = output?.[MetaId];
      if (metaPatch !== undefined && output != null) {
        delete output[MetaId];
      }

      delete output?.id;

      await this._entityManager.atomicReplaceObject(object.id, {
        data: output,
        type: migration.toType,
        meta: metaPatch,
      });
      const postMigrationType = Obj.getTypeURI(object);
      invariant(postMigrationType != null && postMigrationType.toString() === migration.toType.toString());

      if (migration.onMigration) {
        await migration.onMigration({ before, object, db: this });
      }
    }
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
    const response = await runServiceCall(this.#runtime, this.#feedService, 'FeedService.getSyncState', {
      spaceId: this.spaceId,
      namespaces: [],
    });
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

  async beginMigration(options: Migration.TransactionOptions = {}): Promise<Migration.Transaction> {
    invariant(options.root === 'update' || this.#createEpoch, 'Database cannot create epochs.');
    // Loaded on demand: migrations never run during boot.
    const { MigrationTransaction } = await import('./migration-transaction.ts');
    return new MigrationTransaction({
      repo: this._repo,
      rootHandle: this._entityManager.getSpaceRootDocHandle(),
      // spaceKey is deprecated but still written so older clients can resolve the owning space.
      access: { spaceId: this.spaceId, spaceKey: this.spaceKey.toHex() },
      flush: () => this.flush(),
      createEpoch: this.#createEpoch && this.#createEpochAndAwaitRoot.bind(this, this.#createEpoch),
      options,
    });
  }

  /** The epoch can be applied before this database loads its root; a following transaction must read the new root. */
  async #createEpochAndAwaitRoot(createEpoch: (rootUrl: string) => Promise<void>, rootUrl: string): Promise<void> {
    const switched = this.rootChanged.waitFor(() => this._entityManager.getSpaceRootDocHandle().url === rootUrl);
    await createEpoch(rootUrl);
    await switched;
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

  atomicReplaceObject(id: string, params: Parameters<EntityManager['atomicReplaceObject']>[1]) {
    return this._entityManager.atomicReplaceObject(id, params);
  }

  allObjectCores() {
    return this._entityManager.allObjectCores();
  }

  /** Objects written locally that the index may not reflect yet; see `EntityManager.unindexedWrites`. */
  unindexedWrites(): Iterable<string> {
    return this._entityManager.unindexedWrites();
  }

  areStrongDepsSatisfied(core: Parameters<EntityManager['areStrongDepsSatisfied']>[0]) {
    return this._entityManager.areStrongDepsSatisfied(core);
  }

  areStrongDepsResolved(core: Parameters<EntityManager['areStrongDepsResolved']>[0]) {
    return this._entityManager.areStrongDepsResolved(core);
  }

  getDocumentHeads(): Promise<SpaceDocumentHeads> {
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

/**
 * Whether entities of this type are ones a user creates and sees: not a meta-type, and persisted in a space
 * or carrying {@link Annotation.UserType}. Mirrors `TypeOptions.isUserType` in `@dxos/app-toolkit`, which
 * ECHO cannot depend on, except that relation types qualify too.
 */
const isUserFacing = (type: Type.AnyEntity): boolean =>
  !Type.isTypeKind(type) &&
  (Type.getDatabase(type) != null || Option.isSome(Annotation.UserType.get(Type.getSchema(type))));

/** The caller's origin, or else a guess: foreign keys mean a sync or import wrote the entity. */
const resolveOrigin = (entity: Entity.Unknown, origin?: Database.Origin): Database.Origin =>
  origin ?? (Entity.getMeta(entity).keys.length > 0 ? 'system' : 'unknown');

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
