//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import type * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { type CleanupFn, Event } from '@dxos/async';
import {
  Blob,
  type Change,
  Database,
  Error as EchoError,
  Entity,
  type Feed,
  type Filter,
  type Hypergraph,
  JsonSchema,
  type Migration,
  Obj,
  Query,
  Ref,
  Relation,
  Type,
} from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import {
  ATTR_DELETED,
  ObjectDatabaseId,
  ObjectDeletedId,
  ParentId,
  SelfURIId,
  defineHiddenProperty,
  getRefSavedTarget,
  makeDecodedEntityLive,
  matchMetaKey,
  objectFromJSON,
  objectStructureToJson,
  setRefResolver,
  setRefResolverOnData,
} from '@dxos/echo/internal';
import { type FeedStore } from '@dxos/feed';
import { invariant } from '@dxos/invariant';
import { DXN, EID, SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedProtocol } from '@dxos/protocols';

import { type Doc } from './doc-store.ts';
import { UnsupportedOperationError } from './errors.ts';
import { DatabaseRefResolver, type EntitySource, SqliteGraph } from './graph.ts';
import { ObjectStore, type StoredEntity } from './object-store.ts';
import { LiveQueryResult, type ResultItem, asItem } from './query-result.ts';
import { type EntityRecord, localEntityId, toRecord } from './record.ts';
import { SimpleRegistry, matchRegistry } from './registry.ts';
import { compileChanges, isChangesQuery } from './sql/changes.ts';
import {
  type CompiledQuery,
  type FeedRules,
  type GroupedShape,
  compileQuery,
  versionRangeKey,
  versionRanges,
} from './sql/compile.ts';

export type OpenOptions = {
  /**
   * Space whose rows this database owns; one SQLite file can hold several spaces.
   * @default a fresh random space id
   */
  spaceId?: SpaceId;

  /**
   * Static types to register, so stored objects of these types hydrate as typed live objects.
   */
  types?: readonly Type.AnyEntity[];

  /**
   * The graph of the other databases opened over the same file, which this one joins: they share a
   * registry, and a query may read their spaces. Without it the database has a graph of its own.
   */
  graph?: SqliteGraph;

  /**
   * Whether this file positions feed blocks itself, as the authority of a space no server syncs; by
   * default the space's authority positions them.
   */
  assignPositions?: boolean;
};

/**
 * Counters for asserting and benchmarking how much of the space is read and held.
 */
export type Diagnostics = {
  /** Hydrated entities still reachable from outside the database. */
  readonly resident: number;
  /** Entities hydrated from storage since open. */
  readonly hydrated: number;
  /** Compiled query statements executed. */
  readonly queries: number;
  /** Single-row loads (ref resolution, relation endpoints, parents). */
  readonly loads: number;
  /** Working-set entries, live or awaiting finalization. */
  readonly tracked: number;
};

type Run = <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>) => Promise<A>;

/**
 * ECHO {@link Database.Database} backed by SQLite, which is the source of truth: the space is never
 * resident. Queries compile to one SQL statement and hydrate only their result rows; refs load their
 * single target row. Hydrated objects are ordinary live objects held weakly, so an object nobody holds
 * is garbage-collected; mutations are observed with `Entity.subscribe` and written behind, batched per
 * microtask, and held strongly until durable.
 */
export class SqliteDatabase implements Database.Database, EntitySource, AsyncDisposable {
  readonly [Database.TypeId]: Database.TypeId = Database.TypeId;

  readonly #spaceId: SpaceId;
  readonly #store: ObjectStore;
  readonly #run: Run;
  readonly #registry: SimpleRegistry;
  readonly #resolver: DatabaseRefResolver;
  readonly #graph: SqliteGraph;
  #unregister: CleanupFn;

  /** The working set: one live instance per id while anything outside holds it. */
  readonly #live = new Map<string, WeakRef<Entity.Unknown>>();
  readonly #finalizer = new FinalizationRegistry<string>((id) => {
    if (this.#live.get(id)?.deref() === undefined) {
      this.#live.delete(id);
    }
  });
  /** Keyed by the entity so a subscription never keeps its entity alive. */
  readonly #subscriptions = new WeakMap<Entity.Unknown, CleanupFn>();
  readonly #hydrating = new Map<string, Promise<Entity.Unknown | undefined>>();
  /** The states an object passed through since its last write, one per edit. */
  readonly #versions = new Map<string, EntityRecord[]>();
  /** The feed each live feed item is appended to. */
  readonly #items = new WeakMap<Entity.Unknown, FeedTarget>();
  /** Items removed from their feed: their edits are not written anywhere. */
  readonly #detached = new WeakSet<Entity.Unknown>();
  /** Item ids to tombstone in the next write batch. */
  readonly #tombstones = new Map<string, FeedTarget>();
  /** Document heads each live entity's state was read at; its next write is an edit made there. */
  readonly #heads = new WeakMap<Entity.Unknown, readonly string[]>();
  /** Persisted type entities; few, and needed to hydrate anything, so held for the database's life. */
  readonly #types = new Map<string, Entity.Unknown>();

  /** Changed entities, held strongly until their write is durable. */
  #dirty = new Map<string, Entity.Unknown>();
  #purged = new Set<string>();
  /** A delete or restore in the pending batch: the cascade can hide rows of any type. */
  #deletionChanged = false;
  /** Entities removed themselves; the rest of {@link ObjectDeletedId} is derived from their dependencies. */
  readonly #ownDeleted = new WeakSet<Entity.Unknown>();
  /** The newest change-log record read, and the `data_version` it was read at (F-8.5). */
  #changeCursor: number | undefined;
  #dataVersion: number | undefined;
  #polling = false;
  #scheduled = false;
  /** Set while the database writes a derived meta field, whose change notification is not an edit. */
  #stamping = false;
  #writes: Promise<void> = Promise.resolve();
  #writeError: unknown = undefined;
  #closed = false;

  /** One live result per distinct query, while anything holds it, so its atom and subscription are shared. */
  readonly #queries = new Map<string, WeakRef<LiveQueryResult<unknown>>>();
  readonly #queryFinalizer = new FinalizationRegistry<string>((key) => {
    if (this.#queries.get(key)?.deref() === undefined) {
      this.#queries.delete(key);
    }
  });

  /** Fires with the type DXNs of each committed write batch; subscribed queries re-execute on it. */
  readonly #committed = new Event<ReadonlySet<string>>();
  readonly #counters = { hydrated: 0, queries: 0, loads: 0 };

  private constructor(
    spaceId: SpaceId,
    store: ObjectStore,
    run: Run,
    types: readonly Type.AnyEntity[],
    graph: SqliteGraph | undefined,
  ) {
    this.#spaceId = spaceId;
    this.#store = store;
    this.#run = run;
    // The meta-type is registered so persisted `Type.Type` rows decode.
    this.#graph = graph ?? new SqliteGraph(new SimpleRegistry([Type.Type]));
    this.#registry = this.#graph.registry;
    this.#registry.add([Type.Type, ...types].filter((type) => !this.#registry.list().includes(type)));
    this.#resolver = new DatabaseRefResolver(this);
    this.#unregister = this.#join();
  }

  /** Joins the graph, follows its registry and watches other connections' commits; the cleanup stops all three. */
  #join(): CleanupFn {
    const unregister = this.#graph.register(this, this.#resolver);
    // A registry-scoped query answers from the shared registry, so a change there re-runs queries.
    const unsubscribe = this.#registry.changed.on(() => this.#committed.emit(new Set([ANY_TYPE])));
    const timer = setInterval(() => void this.#pollOtherWriters(), QUERY_POLL_MS);
    // The poll must not keep a process alive that is otherwise done.
    timer.unref?.();
    return () => {
      clearInterval(timer);
      unregister();
      unsubscribe();
    };
  }

  /**
   * Applies what other connections to the file committed: SQLite's `data_version` moves when one does,
   * and the change log names the objects it wrote (F-8.5).
   */
  async #pollOtherWriters(): Promise<void> {
    if (this.#polling || this.#closed || this.#changeCursor === undefined) {
      return;
    }
    this.#polling = true;
    try {
      const version = await this.#run(this.#store.dataVersion());
      if (version === this.#dataVersion) {
        return;
      }
      this.#dataVersion = version;
      const { lastId, ids } = await this.#run(this.#store.readChanges(this.#changeCursor));
      this.#changeCursor = lastId;
      if (ids.size > 0) {
        this.applyCommitted(ids);
      }
    } catch (err) {
      log.warn("could not read other connections' commits", { error: err });
    } finally {
      this.#polling = false;
    }
  }

  /** Tells the databases sharing this file, in this process and others, that a commit wrote `ids`. */
  async #announce(ids: ReadonlySet<string>): Promise<void> {
    this.#graph.notifyCommitted(this, ids);
    await this.#run(this.#store.logChanges(ids));
  }

  /**
   * Opens (creating if needed) the database for a space. Reads only the persisted type rows.
   * Pending writes are flushed when the scope closes.
   */
  static open(
    options: OpenOptions = {},
  ): Effect.Effect<SqliteDatabase, SqlError.SqlError, SqlClient.SqlClient | Scope.Scope> {
    return Effect.acquireRelease(
      Effect.gen(function* () {
        const context = yield* Effect.context<SqlClient.SqlClient>();
        const spaceId = options.spaceId ?? SpaceId.random();
        const store = yield* ObjectStore.open(spaceId, { assignPositions: options.assignPositions });
        // Blocks a previous session appended but did not index (it stopped between the two) are indexed now.
        yield* store.index();
        const db = new SqliteDatabase(
          spaceId,
          store,
          Effect.runPromiseWith(context),
          options.types ?? [],
          options.graph,
        );
        const types = yield* store.loadTypes();
        yield* Effect.promise(() => db.#registerTypes(types));
        // Commits before now are in what this database reads; it follows the ones after.
        db.#dataVersion = yield* store.dataVersion();
        db.#changeCursor = (yield* store.readChanges()).lastId;
        return db;
      }),
      (db) => Effect.promise(() => db.close()),
    ).pipe(Effect.withSpan('SqliteDatabase.open'));
  }

  /**
   * {@link Database.Service} layer over {@link open}.
   */
  static layer(options: OpenOptions = {}): Layer.Layer<Database.Service, SqlError.SqlError, SqlClient.SqlClient> {
    return Layer.effect(Database.Service, Effect.map(SqliteDatabase.open(options), Database.makeService));
  }

  get spaceId(): SpaceId {
    return this.#spaceId;
  }

  get graph(): Hypergraph.Hypergraph {
    return this.#graph;
  }

  get registry(): SimpleRegistry {
    return this.#registry;
  }

  /**
   * The feed store holding this space's blocks, which sync pulls into and pushes from.
   */
  get feedStore(): FeedStore {
    return this.#store.feedStore;
  }

  /**
   * Calls `listener` after every committed write batch, local or applied from sync.
   */
  onCommit(listener: () => void): CleanupFn {
    return this.#committed.on(() => listener());
  }

  /**
   * Takes or renews the space's sync lease for `holder`, which only one connection to the file holds at a
   * time; it lapses when not renewed for `ttl` ms (F-8.3).
   */
  holdSyncLease(holder: string, ttl: number): Promise<boolean> {
    return this.#run(this.#store.holdSyncLease(holder, ttl));
  }

  /** Gives up the space's sync lease, if `holder` holds it. */
  releaseSyncLease(holder: string): Promise<void> {
    return this.#run(this.#store.releaseSyncLease(holder));
  }

  /**
   * Runs an effect against this database's SQL client.
   */
  runSql<A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise<A> {
    return this.#run(effect);
  }

  toJSON(): object {
    return { spaceId: this.#spaceId };
  }

  /**
   * How much has been read and how much is held.
   */
  diagnostics(): Diagnostics {
    let resident = 0;
    for (const ref of this.#live.values()) {
      if (ref.deref() !== undefined) {
        resident++;
      }
    }
    return { resident, tracked: this.#live.size, ...this.#counters };
  }

  /**
   * The compiled statement for a query, for inspection and `EXPLAIN` tests.
   */
  compile(query: Query.Any | Filter.Any): CompiledQuery {
    return compileQuery(toAst(query), { spaceId: this.#spaceId });
  }

  /**
   * `EXPLAIN QUERY PLAN` detail lines for a query's compiled statement.
   */
  explain(query: Query.Any | Filter.Any): Promise<string[]> {
    return this.#run(this.#store.explain(this.compile(query)));
  }

  /**
   * Reopens a closed database: it rejoins its graph and resumes writing. Objects held from before
   * stay live.
   */
  async open(): Promise<void> {
    if (!this.#closed) {
      return;
    }
    this.#closed = false;
    this.#unregister = this.#join();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  /**
   * Flushes pending writes and releases every subscription. Idempotent.
   */
  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }
    try {
      await this.flush();
    } finally {
      this.#closed = true;
      this.#unregister();
      for (const ref of this.#live.values()) {
        const entity = ref.deref();
        if (entity) {
          this.#subscriptions.get(entity)?.();
        }
      }
      this.#live.clear();
    }
  }

  //
  // Objects.
  //

  /**
   * Resident objects only: the synchronous API cannot read storage. Prefer a query or a ref.
   */
  getObjectById<T extends Obj.Unknown = Obj.Unknown>(id: string, opts?: Database.GetObjectByIdOptions): T | undefined {
    const entity = this.#live.get(id)?.deref();
    if (!entity || !Obj.isObject(entity) || (Entity.isDeleted(entity) && !opts?.deleted)) {
      return undefined;
    }
    // Callers name the expected type; the id lookup cannot check it.
    return entity as T;
  }

  add<T extends Entity.Unknown = Entity.Unknown>(obj: T & Database.RejectTypeEntity<T>, opts?: Database.AddOptions): T {
    if (opts?.to) {
      this.#attachItem(obj, opts.to);
      return obj;
    }
    if (Type.isType(obj)) {
      throw new TypeError('Type entities must be persisted via db.addType(), not db.add().');
    }
    this.#attach(obj);
    return obj;
  }

  async addType<T extends Type.AnyEntity>(type: T): Promise<T> {
    invariant(Type.isType(type), 'addType expects a Type entity');
    const typename = Type.getTypename(type);
    const version = Type.getVersion(type);
    for (const existing of this.#types.values()) {
      if (
        Type.isType(existing) &&
        !Entity.isDeleted(existing) &&
        Type.getTypename(existing) === typename &&
        Type.getVersion(existing) === version
      ) {
        // Matched on typename + version, which is what identifies the caller's `T`.
        return existing as T;
      }
    }

    // Static types carry an Effect schema rather than stored JSON Schema, so persist a copy built from it.
    const persisted = Type.makeObjectFromJsonSchema({
      typename,
      version,
      jsonSchema: JsonSchema.toJsonSchema(Type.getSchema(type)),
    });
    this.#attach(persisted);
    this.#types.set(persisted.id, persisted);
    this.#registry.add([persisted]);
    // The stored copy stands in for the caller's type of the same typename + version.
    return persisted as T;
  }

  remove(obj: Entity.Unknown): void {
    invariant(Entity.getDatabase(obj) === this, 'Object is not in this database.');
    if (this.#ownDeleted.has(obj)) {
      return;
    }
    this.#ownDeleted.add(obj);
    if (Type.isType(obj)) {
      this.#registry.remove(obj.id);
    }
    this.#deletionChanged = true;
    this.#refreshDeletion();
    this.#markDirty(obj);
  }

  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref.Ref<T> {
    const ref = Ref.fromURI(uri);
    setRefResolver(ref, this.#resolver);
    return ref;
  }

  query: Database.QueryFn = ((queryOrFilter: Query.Any | Filter.Any) => {
    const ast = toAst(queryOrFilter);
    const key = JSON.stringify(ast);
    const cached = this.#queries.get(key)?.deref();
    if (cached) {
      return cached;
    }
    if (isChangesQuery(ast)) {
      const changes = this.#changesQuery(ast);
      this.#queries.set(key, new WeakRef(changes));
      this.#queryFinalizer.register(changes, key);
      return changes;
    }
    const scopes = ast.type === 'from' && ast.from._tag === 'scope' ? ast.from.scopes : undefined;
    const fromRegistry = scopes?.some((scope) => scope._tag === 'registry' && scope.location === 'local') ?? false;
    // No scope is every accessible space (`'all-accessible-spaces'`).
    const fromSpace = scopes === undefined || scopes.length === 0 || scopes.some((scope) => scope._tag !== 'registry');
    // Compiled per execution: version ranges read which versions exist, and a scope reads the spaces
    // open in the graph then. An unsupported clause rejects every execution, as echo-client's does.
    const ranges = fromSpace ? versionRanges(ast) : [];
    const typenames = queryTypenames(ast);
    const result = new LiveQueryResult<unknown>({
      resident: ast.type === 'aggregate' || ast.type === 'from' ? undefined : () => this.#matchResident(ast),
      source: 'local',
      invalidated: this.#committed,
      affectedBy: (written) =>
        typenames === undefined || written.has(ANY_TYPE) || [...written].some((dxn) => typenames.has(typenameOf(dxn))),
      execute: async () => {
        const statement = fromSpace
          ? compileQuery(ast, {
              spaceId: this.#spaceId,
              versions: ranges.length > 0 ? await this.#satisfying(ranges) : undefined,
              accessible: this.#graph.spaceIds,
              feeds: await this.#feedRules(),
            })
          : undefined;
        const stored = statement ? await this.#execute(statement) : [];
        const registered = fromRegistry && ast.type === 'from' ? matchRegistry(ast.query, this.#registry.list()) : [];
        const keys = new Set(stored.map((item) => item.key));
        return [...stored, ...registered.filter((entity) => !keys.has(entity.id)).map((entity) => asItem(entity))];
      },
    });
    this.#queries.set(key, new WeakRef(result));
    this.#queryFinalizer.register(result, key);
    return result;
    // The overloaded `QueryFn` cannot be satisfied by one generic implementation without a cast.
  }) as Database.QueryFn;

  /** What the space's feed options say about reading their items, as of now. */
  async #feedRules(): Promise<FeedRules> {
    const options = await this.#run(this.#store.feedOptions());
    const now = Date.now();
    const unindexed: string[] = [];
    const cutoffs: Record<string, number> = {};
    for (const [feedId, feedOptions] of options) {
      if (feedOptions.indexing?.enabled === false) {
        unindexed.push(feedId);
      }
      if (feedOptions.retention?.maxAge !== undefined) {
        cutoffs[feedId] = now - feedOptions.retention.maxAge;
      }
    }
    return { unindexed, cutoffs };
  }

  /**
   * Indexes every block not indexed yet, including blocks sync pulled, and makes the results visible
   * to queries. A flush already indexes local writes.
   */
  async updateIndexes(): Promise<void> {
    await this.flush();
    await this.applyRemote();
  }

  async flush(opts?: Database.FlushOptions): Promise<void> {
    await this.#flushWrites();
    if (opts?.updates) {
      // A commit re-executes subscribed queries asynchronously; `updates` waits until they answered.
      await Promise.resolve();
      for (const ref of this.#queries.values()) {
        await ref.deref()?.settled();
      }
    }
  }

  async #flushWrites(): Promise<void> {
    // A failed batch is requeued without rescheduling, so flushing is what retries it.
    this.#writeError = undefined;
    if (this.#dirty.size > 0 || this.#purged.size > 0 || this.#tombstones.size > 0) {
      this.#schedule();
    }
    // Let the microtask that batches the current turn's writes enqueue them first.
    await Promise.resolve();
    await this.#writes;
    if (this.#writeError !== undefined) {
      const error = this.#writeError;
      this.#writeError = undefined;
      throw error;
    }
  }

  //
  // Maintenance.
  //

  async stats(): Promise<Database.DatabaseStats> {
    await this.flush();
    const objects = await this.#run(this.#store.counts());
    const { resident } = this.diagnostics();
    return {
      objects,
      documents: 0,
      feeds: 0,
      feedBlocks: 0,
      loaded: {
        client: {
          documents: 0,
          objects: resident,
          feeds: 0,
          feedObjects: 0,
          registryTotal: this.#registry.list().length,
        },
        host: { documents: 0, documentsTotal: 0, queriesTotal: 0, leases: 0 },
      },
    };
  }

  /**
   * Permanently removes deleted rows and everything their deletion hides (descendants and relations
   * with a removed endpoint), with their reference and text rows.
   */
  async runGarbageCollection(_options?: Database.GarbageCollectionOptions): Promise<Database.GarbageCollectionReport> {
    await this.flush();
    const ids = await this.#run(this.#store.deletedIds());
    for (const id of ids) {
      const entity = this.#live.get(id)?.deref();
      if (entity) {
        this.#subscriptions.get(entity)?.();
      }
      this.#live.delete(id);
      this.#types.delete(id);
      this.#purged.add(id);
    }
    await this.flush();
    const purgedFeedBlocks = await this.#run(this.#store.compactDocuments());
    return { unlinkedObjects: ids.length, removedDocuments: 0, removedIndexEntries: ids.length, purgedFeedBlocks };
  }

  retainObjects(_keep: Iterable<string>): string[] {
    // Returning the dropped ids synchronously would require the whole space in memory.
    throw new UnsupportedOperationError('retainObjects');
  }

  async getSyncState(_options?: Database.GetSyncStateOptions): Promise<Database.SyncState> {
    return {
      localDocumentCount: 0,
      remoteDocumentCount: 0,
      totalDocumentCount: 0,
      unsyncedDocumentCount: 0,
      blocksToPull: '0',
      blocksToPush: '0',
      totalBlocks: '0',
    };
  }

  subscribeToSyncState(_cb: (state: Database.SyncState) => void, _options?: Database.GetSyncStateOptions): CleanupFn {
    // Nothing ever syncs, so the state never changes.
    return () => {};
  }

  //
  // Blobs (inline storage only).
  //

  async createBlob(bytes: Uint8Array, options?: { type?: string; storage?: string }): Promise<Blob.Blob> {
    const storage = options?.storage ?? Blob.Storage.inline;
    if (storage !== Blob.Storage.inline) {
      throw new EchoError.BlobNotAvailableError({ backend: storage, key: '', reason: 'backend-not-registered' });
    }
    if (bytes.byteLength > Blob.MAX_INLINE_SIZE) {
      throw new EchoError.BlobTooLargeError({ size: bytes.byteLength, limit: Blob.MAX_INLINE_SIZE });
    }
    return Blob.make({ type: options?.type, size: bytes.byteLength, data: { _tag: 'inline', bytes } });
  }

  async createBlobFromUpload(_uploadId: string, options?: { storage?: string }): Promise<Blob.Blob> {
    throw new EchoError.BlobNotAvailableError({
      backend: options?.storage ?? Blob.Storage.inline,
      key: _uploadId,
      reason: 'not-found',
    });
  }

  async readBlob(blob: Blob.Blob): Promise<Uint8Array> {
    if (blob.data._tag !== 'inline') {
      throw new EchoError.BlobNotAvailableError({
        backend: Blob.Storage.inline,
        key: blob.data.uri,
        reason: 'backend-not-registered',
      });
    }
    return blob.data.bytes;
  }

  async blobExists(blob: Blob.Blob): Promise<boolean> {
    return blob.data._tag === 'inline';
  }

  async getBlobUrl(blob: Blob.Blob): Promise<string | undefined> {
    if (blob.data._tag !== 'inline') {
      return undefined;
    }
    // Chunked: spreading a multi-megabyte array into one call overflows the argument limit.
    const bytes = blob.data.bytes;
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return `data:${blob.type ?? 'application/octet-stream'};base64,${btoa(binary)}`;
  }

  //
  // Branches and history: a single timeline with no history.
  //

  getCurrentBranch(_objectId: string): string {
    return 'main';
  }

  listBranches(_objectId: string): string[] {
    return ['main'];
  }

  getVersion<T extends Obj.Unknown>(obj: T, heads: readonly string[]): Obj.Snapshot<T> {
    const doc = this.#settledDocument(obj);
    invariant(doc, `No document for object ${obj.id}.`);
    const snapshot = this.#snapshotAt(obj, doc, heads);
    invariant(snapshot, `Object ${obj.id} does not exist at the given heads.`);
    return snapshot;
  }

  /**
   * The object's history, oldest first: one entry per change to its document that touched the object
   * (or `property`), with the value before and after. Each change is diffed against the frontier of the
   * changes before it in topological order, so a concurrent change reports only its own effect.
   */
  getChanges<T extends Obj.Unknown>(obj: T, opts: Obj.GetChangesOptions = {}): Change.ValueChange<unknown>[] {
    const doc = this.#settledDocument(obj);
    if (!doc) {
      return [];
    }
    const { property } = opts;
    const mount = ['objects', obj.id];
    const target: (string | number)[] = property === undefined ? mount : [...mount, 'data', property];
    const readValue = (heads: readonly string[]): unknown => {
      const snapshot = this.#snapshotAt(obj, doc, heads);
      return property === undefined || snapshot === undefined ? snapshot : Reflect.get(snapshot, property);
    };

    const changes: Change.ValueChange<unknown>[] = [];
    let frontier: string[] = [];
    for (const meta of A.getChangesMetaSince(doc, [])) {
      const previous = frontier;
      frontier = [...previous.filter((hash) => !meta.deps.includes(hash)), meta.hash].sort();
      if (!A.diff(doc, previous, frontier).some((patch) => overlaps(patch.path, target))) {
        continue;
      }
      const before = readValue(previous);
      const after = readValue(frontier);
      // A write to an ancestor (the document's first change) overlaps the target without changing it.
      if (before === after) {
        continue;
      }
      changes.push(
        Object.freeze({
          key: meta.hash,
          source: 'document',
          // Automerge stores change time in epoch seconds.
          time: meta.time * 1000,
          actor: meta.actor,
          seq: meta.seq,
          ops: meta.maxOp - meta.startOp + 1,
          object: obj.id,
          ...(property !== undefined && { property }),
          heads: Object.freeze(frontier),
          ...(meta.message != null && { message: meta.message }),
          before,
          after,
        }),
      );
    }
    return changes;
  }

  /**
   * The object's document with every edit made so far applied, which history reads synchronously: edits
   * not yet flushed are written into the cached document now, and appended by the next flush.
   */
  #settledDocument(entity: Entity.Unknown): Doc | undefined {
    invariant(Entity.getDatabase(entity) === this, 'Object is not in this database.');
    if (this.#items.has(entity)) {
      return undefined;
    }
    const versions = [...(this.#versions.get(entity.id) ?? [])];
    if (this.#dirty.has(entity.id)) {
      const current = toRecord(entity, this.#spaceId, this.#ownDeleted.has(entity));
      const last = versions.at(-1);
      if (!last || JSON.stringify(last.body) !== JSON.stringify(current.body)) {
        versions.push(current);
      }
    }
    if (versions.length > 0) {
      const results = this.#store.edit(
        versions.map((version, index) => ({ ...version, heads: index === 0 ? this.#heads.get(entity) : undefined })),
      );
      const result = results?.get(entity.id);
      if (result) {
        this.#versions.delete(entity.id);
        this.#heads.set(entity, result.heads);
      }
    }
    return this.#store.peekDocument(entity.id);
  }

  /** The object as its document holds it at `heads`, as an immutable snapshot; undefined before it existed. */
  #snapshotAt<T extends Obj.Unknown>(entity: T, doc: Doc, heads: readonly string[]): Obj.Snapshot<T> | undefined {
    if (heads.length === 0) {
      return undefined;
    }
    const structure = A.view(doc, [...heads]).objects?.[entity.id];
    if (structure == null) {
      return undefined;
    }
    const json = objectStructureToJson(entity.id, structure);
    const data: Record<string | symbol, unknown> = { id: entity.id };
    for (const [key, value] of Object.entries(json)) {
      if (key !== 'id' && !key.startsWith('@') && value !== undefined) {
        data[key] = this.#decodeReferences(value);
      }
    }
    // The live object's snapshot carries the brand, and the type, database and meta symbols a snapshot is
    // read through.
    const template = Obj.getSnapshot(entity);
    for (const symbol of Object.getOwnPropertySymbols(template)) {
      const descriptor = Object.getOwnPropertyDescriptor(template, symbol);
      if (descriptor) {
        Object.defineProperty(data, symbol, descriptor);
      }
    }
    data[Entity.SnapshotKindId] = Reflect.get(template, Entity.SnapshotKindId);
    Object.freeze(data);
    return isSnapshotOf(entity, data) ? data : undefined;
  }

  /** Stored data with its encoded references (`{ '/': uri }`) as refs resolving in this database. */
  #decodeReferences(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.#decodeReferences(item));
    }
    if (value !== null && typeof value === 'object') {
      const record: Record<string, unknown> = { ...value };
      const uri = record['/'];
      if (typeof uri === 'string' && Object.keys(record).length === 1) {
        return this.makeRef(URI.make(uri));
      }
      return Object.fromEntries(Object.entries(record).map(([key, inner]) => [key, this.#decodeReferences(inner)]));
    }
    return value;
  }

  async beginMigration(): Promise<Migration.Transaction> {
    throw new UnsupportedOperationError('beginMigration');
  }

  async createBranch(): Promise<void> {
    throw new UnsupportedOperationError('createBranch');
  }

  async switchBranch(_rootObjectId: string, name: string): Promise<void> {
    if (name !== 'main') {
      throw new UnsupportedOperationError('switchBranch');
    }
  }

  async mergeBranch(): Promise<void> {
    throw new UnsupportedOperationError('mergeBranch');
  }

  async syncBranch(): Promise<void> {
    throw new UnsupportedOperationError('syncBranch');
  }

  deleteBranch(): void {
    throw new UnsupportedOperationError('deleteBranch');
  }

  async branch<T extends Obj.Unknown>(obj: T, name: string): Promise<Database.BranchBinding<T>> {
    if (name !== 'main') {
      throw new UnsupportedOperationError('branch');
    }
    return { object: obj, dispose: () => {} };
  }

  //
  // Feeds: items are blocks of the feed's own feed in its namespace, one whole item per block.
  //

  async appendToFeed(feed: Feed.Feed, entities: Entity.Unknown[]): Promise<void> {
    for (const entity of entities) {
      this.#attachItem(entity, feed);
    }
    await this.flush();
  }

  async forkFeed(_feed: Feed.Feed, _base: Entity.Unknown): Promise<Feed.BranchId> {
    throw new UnsupportedOperationError('forkFeed');
  }

  async deleteFromFeed(feed: Feed.Feed, entities: Entity.Unknown[]): Promise<void> {
    await this.removeFeedItemsByIds(
      feed,
      entities.map((entity) => entity.id),
    );
  }

  async removeFeedItemsByIds(feed: Feed.Feed, ids: string[]): Promise<void> {
    const target = feedTarget(feed);
    for (const id of ids) {
      this.#tombstones.set(id, target);
      const resident = this.#live.get(id)?.deref();
      if (resident && this.#items.has(resident)) {
        // A later edit of the removed item must not append it again.
        this.#items.delete(resident);
        this.#detached.add(resident);
        this.#dirty.delete(id);
        defineHiddenProperty(resident, ObjectDeletedId, true);
      }
    }
    this.#deletionChanged = true;
    this.#schedule();
    await this.flush();
  }

  async syncFeed(_feed: Feed.Feed, _options?: Feed.SyncOptions): Promise<void> {
    // Feeds sync with the rest of the space, through `SpaceSync`; locally there is nothing to wait for.
    await this.flush();
  }

  async getFeedSyncState(feed: Feed.Feed): Promise<Feed.SyncState> {
    await this.flush();
    const { blocksToPush, totalBlocks } = await this.#run(this.#store.itemCounts(feedTarget(feed).namespace));
    return { blocksToPull: 0, blocksToPush, totalBlocks };
  }

  async evictFeedHandle(_feed: Feed.Feed): Promise<void> {
    // Items are held weakly like every other object; there is no per-feed handle to drop.
  }

  /**
   * Binds an item to a feed: it lives in this database, its parent is the feed, and it and every later
   * edit of it are appended to the feed's blocks.
   */
  #attachItem(item: Entity.Unknown, feed: Feed.Feed): void {
    if (!Entity.isEntity(item)) {
      throw new TypeError('Feed items must be live ECHO objects. Create them with Obj.make(Type, props).');
    }
    if (Entity.getDatabase(feed) === undefined) {
      this.#attach(feed);
    }
    const resident = this.#live.get(item.id)?.deref();
    if (resident && resident !== item && this.#items.get(resident)?.feedId === feed.id) {
      // Appending an id the feed holds updates the live item in place, so holders of it see the state.
      this.#replaceState(resident, Entity.toJSON(item));
      return;
    }
    this.#detached.delete(item);
    this.#tombstones.delete(item.id);
    if (Entity.isDeleted(item)) {
      defineHiddenProperty(item, ObjectDeletedId, false);
    }
    defineHiddenProperty(item, SelfURIId, EID.make({ spaceId: this.#spaceId, entityId: item.id }));
    defineHiddenProperty(item, ObjectDatabaseId, this);
    defineHiddenProperty(item, ParentId, feed);
    this.#items.set(item, feedTarget(feed));
    if (this.#live.get(item.id)?.deref() !== item) {
      this.#register(item);
    }
    this.#adoptReferences(item);
    this.#markDirty(item);
  }

  //
  // Working set.
  //

  peek(uri: string): Entity.Unknown | undefined {
    const id = this.#entityIdOf(uri);
    return id ? this.#live.get(id)?.deref() : undefined;
  }

  async load(uri: string): Promise<Entity.Unknown | undefined> {
    const id = this.#entityIdOf(uri);
    if (!id) {
      return undefined;
    }
    const resident = this.#live.get(id)?.deref();
    if (resident) {
      return resident;
    }
    const hydrating = this.#hydrating.get(id);
    if (hydrating) {
      return hydrating;
    }
    this.#counters.loads++;
    const stored = await this.#run(this.#store.load(id));
    return stored ? this.#hydrate(stored) : undefined;
  }

  #entityIdOf(uri: string): string | undefined {
    return localEntityId(uri, this.#spaceId) ?? undefined;
  }

  /**
   * Runs a compiled statement after committing pending writes (read-your-writes), and hydrates only
   * the rows it returns.
   */
  async #execute(compiled: CompiledQuery): Promise<ResultItem[]> {
    await this.flush();
    this.#counters.queries++;
    const rows = await this.#run(this.#store.query(compiled));
    if (compiled.grouped) {
      return this.#records(rows, compiled.grouped);
    }
    const items = await Promise.all(
      rows.map(async (row) => {
        // A row of another space opened in the graph hydrates in that space's database.
        const owner =
          row.spaceId === undefined || row.spaceId === this.#spaceId ? this : this.#graph.getSource(row.spaceId);
        const entity = owner === this ? await this.#hydrate(row) : await owner?.hydrateStored(row);
        if (entity && owner === this && row.queueId) {
          this.#catchUpItem(entity, row);
        }
        return entity ? asItem(entity, row.rank) : undefined;
      }),
    );
    return items.filter((item): item is ResultItem => item !== undefined);
  }

  /**
   * A query over the change history of the space's documents: frozen change records, or the records an
   * aggregate built over them. Re-executes after every write, which adds changes.
   */
  #changesQuery(ast: QueryAST.Query): LiveQueryResult<unknown> {
    return new LiveQueryResult<unknown>({
      source: 'local',
      invalidated: this.#committed,
      execute: async () => {
        const compiled = compileChanges(ast, { spaceId: this.#spaceId });
        await this.flush();
        const records = await this.#run(this.#store.queryChanges(compiled));
        return records.map((record, index) => ({
          key: compiled.grouped ? `${index}:${JSON.stringify(record)}` : String(record.key),
          value: Object.freeze(record),
        }));
      },
    });
  }

  /**
   * The live instance for a row another database of the graph read.
   *
   * @internal
   */
  hydrateStored(stored: StoredEntity): Promise<Entity.Unknown | undefined> {
    return this.#hydrate(stored);
  }

  /** A query matched against the live objects in memory, for `runSync` before its first execution. */
  #matchResident(ast: QueryAST.Query): ResultItem[] {
    const resident = [...this.#live.values()]
      .map((ref) => ref.deref())
      .filter((entity): entity is Entity.Unknown => entity !== undefined && !Entity.isDeleted(entity));
    try {
      return matchRegistry(ast, resident).map((entity) => asItem(entity));
    } catch {
      // A clause the in-memory matcher cannot answer leaves the first answer to the execution.
      return [];
    }
  }

  /**
   * The pre-pass of version ranges: each range's satisfying versions among those stored for its key.
   */
  async #satisfying(ranges: readonly { key: string; range: string }[]): Promise<Map<string, string[]>> {
    await this.flush();
    const versions = new Map<string, string[]>();
    for (const { key, range } of ranges) {
      const stored = await this.#run(this.#store.versionsOf(key));
      versions.set(
        versionRangeKey(key, range),
        stored.filter((version) => matchMetaKey(key, range, key, version)),
      );
    }
    return versions;
  }

  /**
   * Shapes an aggregate's rows, already grouped and ordered in SQL, into one record per group: its
   * aggregate values, its key fields, and its members under each `items` name.
   */
  async #records(rows: readonly StoredEntity[], shape: GroupedShape): Promise<ResultItem[]> {
    const records = new Map<number, { key: string; record: Record<string, unknown>; members: Entity.Unknown[] }>();
    for (const row of rows) {
      const group = row.group;
      if (!group) {
        continue;
      }
      let entry = records.get(group.ord);
      if (!entry) {
        // Key fields come from the JSON key, where a boolean key stays a boolean.
        entry = { key: group.key, record: { ...group.aggregates, ...JSON.parse(group.key) }, members: [] };
        records.set(group.ord, entry);
      }
      if (!shape.collapsed) {
        const member = await this.#hydrate(row);
        if (member) {
          entry.members.push(member);
        }
      }
    }
    return [...records.values()].map(({ key, record, members }) => {
      for (const name of shape.items) {
        record[name] = members;
      }
      return { key, value: record };
    });
  }

  async #registerTypes(rows: readonly StoredEntity[]): Promise<void> {
    for (const row of rows) {
      const entity = await this.#hydrate(row);
      if (entity && Type.isType(entity)) {
        this.#types.set(entity.id, entity);
        this.#registry.add([entity]);
      }
    }
  }

  /**
   * The live instance for a stored row: the resident one if any, otherwise a newly hydrated one.
   */
  #hydrate(stored: StoredEntity): Promise<Entity.Unknown | undefined> {
    const resident = this.#live.get(stored.id)?.deref();
    if (resident) {
      return Promise.resolve(resident);
    }
    let hydrating = this.#hydrating.get(stored.id);
    if (!hydrating) {
      hydrating = (async () => {
        try {
          const snapshot = await objectFromJSON(withTimestamps(stored), {
            refResolver: this.#resolver,
            uri: EID.make({ spaceId: this.#spaceId, entityId: stored.id }),
            database: this,
          });
          const entity = makeDecodedEntityLive(snapshot);
          invariant(Entity.isEntity(entity));
          // A concurrent add or hydration may have registered the id while this one decoded.
          const raced = this.#live.get(stored.id)?.deref();
          if (raced) {
            return raced;
          }
          if (stored.queueId) {
            // An item's parent is its feed, and its edits go back to the feed.
            const feed = await this.load(EID.make({ entityId: stored.queueId }));
            if (feed) {
              defineHiddenProperty(entity, ParentId, feed);
            }
            this.#items.set(entity, {
              feedId: stored.queueId,
              namespace: stored.queueNamespace ?? FeedProtocol.WellKnownNamespaces.data,
            });
          }
          this.#register(entity);
          if (stored.heads) {
            this.#heads.set(entity, stored.heads);
          }
          this.#counters.hydrated++;
          return entity;
        } catch (err) {
          log.warn('failed to hydrate entity; skipped', { id: stored.id, error: err });
          return undefined;
        } finally {
          this.#hydrating.delete(stored.id);
        }
      })();
      this.#hydrating.set(stored.id, hydrating);
    }
    return hydrating;
  }

  /**
   * Makes changes another writer appended to these objects' documents visible: indexes the new
   * blocks, and brings resident objects to their documents' state. Called by sync after it inserts
   * pulled blocks.
   */
  async applyRemote(): Promise<void> {
    const done = this.#writes.then(async () => {
      const indexed = await this.#run(this.#store.index());
      await this.#refreshStale(indexed);
      if (indexed.size > 0) {
        this.#committed.emit(new Set([ANY_TYPE]));
        await this.#announce(indexed);
      }
    });
    this.#writes = done.catch((err) => {
      this.#writeError = err;
    });
    await done;
  }

  applyCommitted(ids: ReadonlySet<string>): void {
    if (this.#closed) {
      return;
    }
    const done = this.#writes.then(async () => {
      this.#store.invalidate(ids);
      await this.#refreshStale(ids);
      this.#committed.emit(new Set([ANY_TYPE]));
    });
    this.#writes = done.catch((err) => {
      this.#writeError = err;
    });
  }

  /** Refreshes the resident objects among `ids` whose documents moved past the heads they show. */
  async #refreshStale(ids: Iterable<string>): Promise<void> {
    for (const id of ids) {
      const entity = this.#live.get(id)?.deref();
      if (!entity) {
        continue;
      }
      const stored = await this.#run(this.#store.load(id));
      if (stored?.heads && !sameHeads(stored.heads, this.#heads.get(entity) ?? [])) {
        await this.#refresh(entity, stored);
      }
    }
  }

  /** Takes a stored item's position, which the store stamps on its row once positioned; not an edit. */
  #stampKeys(entity: Entity.Unknown, stored: StoredEntity): void {
    const meta = stored.body['@meta'];
    const keys = meta !== null && typeof meta === 'object' && 'keys' in meta ? meta.keys : undefined;
    const position = Array.isArray(keys)
      ? keys.find((key) => key?.source === FeedProtocol.KEY_QUEUE_POSITION)
      : undefined;
    const current = Obj.isObject(entity) ? Entity.getKeys(entity, FeedProtocol.KEY_QUEUE_POSITION) : [];
    if (!position || !Obj.isObject(entity) || (current.length === 1 && current[0].id === String(position.id))) {
      return;
    }
    this.#stamping = true;
    try {
      Obj.update(entity, (entity) => {
        const keys = Obj.getMeta(entity).keys;
        const others = keys.filter((key) => key.source !== FeedProtocol.KEY_QUEUE_POSITION);
        keys.splice(0, keys.length, ...others, { source: FeedProtocol.KEY_QUEUE_POSITION, id: String(position.id) });
      });
    } finally {
      this.#stamping = false;
    }
  }

  /**
   * Brings a resident item to the row a query read when another writer appended to it since: the
   * feed's last block wins, as in echo-client. An item with unwritten local edits keeps them.
   */
  #catchUpItem(entity: Entity.Unknown, stored: StoredEntity): void {
    if (this.#dirty.has(entity.id) || !Obj.isObject(entity)) {
      return;
    }
    const current: Record<string, unknown> = { ...Entity.toJSON(entity) };
    const differs = Object.entries(stored.body).some(
      ([key, value]) => !key.startsWith('@') && JSON.stringify(current[key]) !== JSON.stringify(value),
    );
    if (differs) {
      this.#stamping = true;
      try {
        this.#replaceState(entity, stored.body);
      } finally {
        this.#stamping = false;
      }
    }
    this.#stampKeys(entity, stored);
  }

  /** Replaces a live object's data and meta with an item's JSON, as an edit that is written back. */
  #replaceState(entity: Entity.Unknown, json: Record<string, unknown>): void {
    if (!Obj.isObject(entity)) {
      return;
    }
    Obj.update(entity, (entity) => {
      const target: Record<string, unknown> = entity;
      for (const key of Object.keys(target)) {
        if (key !== 'id' && !Object.hasOwn(json, key)) {
          delete target[key];
        }
      }
      for (const [key, value] of Object.entries(json)) {
        if (key !== 'id' && !key.startsWith('@')) {
          target[key] = structuredClone(value);
        }
      }
    });
  }

  /**
   * Sets a live entity's state to a stored body, as the change of another writer. The change is
   * observed like a local edit, and its write finds nothing to change in the document.
   */
  async #refresh(entity: Entity.Unknown, stored: StoredEntity): Promise<void> {
    const snapshot = await objectFromJSON(withTimestamps(stored), {
      refResolver: this.#resolver,
      uri: EID.make({ spaceId: this.#spaceId, entityId: stored.id }),
      database: this,
    });
    if (Obj.isObject(entity) && Obj.isObject(snapshot)) {
      // Showing the stored state is not an edit: it must not be written back.
      this.#stamping = true;
      try {
        Obj.update(entity, (entity) => {
          const target: Record<string, unknown> = entity;
          for (const key of Object.keys(target)) {
            if (key !== 'id' && !Object.hasOwn(snapshot, key)) {
              delete target[key];
            }
          }
          Obj.updateFrom(entity, snapshot);
          replaceMeta(Obj.getMeta(entity), Obj.getMeta(snapshot));
        });
      } finally {
        this.#stamping = false;
      }
    }
    const deleted = stored.body[ATTR_DELETED] === true;
    if (deleted !== this.#ownDeleted.has(entity)) {
      if (deleted) {
        this.#ownDeleted.add(entity);
      } else {
        this.#ownDeleted.delete(entity);
      }
      this.#refreshDeletion();
    }
    if (stored.heads) {
      this.#heads.set(entity, stored.heads);
    }
  }

  /**
   * Binds a live entity (and any unstored entities it references) to this database.
   */
  #attach(obj: Entity.Unknown): void {
    if (!Entity.isEntity(obj)) {
      throw new TypeError('db.add expects a live ECHO object. Create it with Obj.make(Type, props).');
    }
    const owner = Entity.getDatabase(obj);
    if (owner === this) {
      if (this.#ownDeleted.has(obj)) {
        // Re-adding a removed object restores it.
        this.#ownDeleted.delete(obj);
        if (Type.isType(obj)) {
          this.#registry.add([obj]);
        }
        this.#deletionChanged = true;
        this.#refreshDeletion();
        this.#markDirty(obj);
      }
      return;
    }
    invariant(owner === undefined, 'Object belongs to another database.');
    const resident = this.#live.get(obj.id)?.deref();
    invariant(resident === undefined || resident === obj, `Another object with id ${obj.id} is in the database.`);

    if (Relation.isRelation(obj)) {
      for (const endpoint of [Relation.getSource(obj), Relation.getTarget(obj)]) {
        if (Entity.isEntity(endpoint) && Entity.getDatabase(endpoint) === undefined) {
          this.#attach(endpoint);
        }
      }
    }

    if (Obj.isObject(obj) && Obj.getMeta(obj).createdAt === undefined) {
      const createdAt = Date.now();
      Obj.update(obj, (obj) => {
        Obj.getMeta(obj).createdAt = createdAt;
      });
    }
    defineHiddenProperty(obj, SelfURIId, EID.make({ spaceId: this.#spaceId, entityId: obj.id }));
    defineHiddenProperty(obj, ObjectDatabaseId, this);
    this.#register(obj);
    this.#adoptReferences(obj);
    // Creation is its own change in the object's history, as echo-client writes it; an object not edited
    // before its first flush still takes a single change.
    this.#versions.set(obj.id, [toRecord(obj, this.#spaceId, false)]);
    this.#markDirty(obj);
  }

  /**
   * Enters an entity into the working set, weakly, and observes its mutations.
   */
  #register(entity: Entity.Unknown): void {
    const id = entity.id;
    this.#live.set(id, new WeakRef(entity));
    this.#finalizer.register(entity, id);
    // The callback captures only the id: the entity must stay collectable.
    const unsubscribe = Entity.subscribe(entity, () => this.#onChanged(id));
    this.#subscriptions.set(entity, unsubscribe);
    if (!this.#items.has(entity)) {
      if (Entity.isDeleted(entity)) {
        // Hydrated from a stored tombstone.
        this.#ownDeleted.add(entity);
      } else if (this.#isDeleted(entity, new Map())) {
        defineHiddenProperty(entity, ObjectDeletedId, true);
      }
    }
  }

  /**
   * Whether an entity is deleted, itself or through a strong dependency (its parent, or a relation's
   * endpoint) a bounded number of hops away, as echo-client judges it.
   */
  #isDeleted(entity: Entity.Unknown, memo: Map<Entity.Unknown, boolean>, depth = 10): boolean {
    if (this.#ownDeleted.has(entity)) {
      return true;
    }
    const cached = memo.get(entity);
    if (cached !== undefined || depth <= 0) {
      return cached ?? false;
    }
    memo.set(entity, false);
    const deleted = this.#dependencies(entity).some(
      (dependency) => Entity.getDatabase(dependency) === this && this.#isDeleted(dependency, memo, depth - 1),
    );
    memo.set(entity, deleted);
    return deleted;
  }

  #dependencies(entity: Entity.Unknown): Entity.Unknown[] {
    const dependencies: Entity.Unknown[] = [];
    const parent = Obj.isObject(entity) ? Obj.getParent(entity) : undefined;
    if (parent && Entity.isEntity(parent)) {
      dependencies.push(parent);
    }
    if (Relation.isRelation(entity)) {
      for (const endpoint of [Relation.getSource(entity), Relation.getTarget(entity)]) {
        if (Entity.isEntity(endpoint)) {
          dependencies.push(endpoint);
        }
      }
    }
    return dependencies;
  }

  /**
   * Re-derives every resident entity's deletion marker after an own deletion changed.
   */
  #refreshDeletion(): void {
    const memo = new Map<Entity.Unknown, boolean>();
    for (const ref of this.#live.values()) {
      const entity = ref.deref();
      if (!entity || this.#items.has(entity) || this.#detached.has(entity)) {
        continue;
      }
      const deleted = this.#isDeleted(entity, memo);
      if (deleted !== Entity.isDeleted(entity)) {
        defineHiddenProperty(entity, ObjectDeletedId, deleted);
      }
    }
  }

  #onChanged(id: string): void {
    if (this.#stamping) {
      return;
    }
    const entity = this.#live.get(id)?.deref();
    if (entity) {
      this.#adoptReferences(entity);
      if (!this.#items.has(entity) && !this.#closed) {
        // Each edit becomes its own document change, as echo-client writes them, so history keeps it.
        const versions = this.#versions.get(id) ?? [];
        versions.push(toRecord(entity, this.#spaceId, this.#ownDeleted.has(entity)));
        this.#versions.set(id, versions);
      }
      this.#markDirty(entity);
    }
  }

  /**
   * Makes refs held by the entity resolvable here, and adds their inline targets that are not stored
   * yet, so a graph built with `Ref.make` persists as a whole.
   */
  #adoptReferences(entity: Entity.Unknown): void {
    setRefResolverOnData(entity, this.#resolver);
    const visit = (value: unknown): void => {
      if (Ref.isRef(value)) {
        const target = getRefSavedTarget(value);
        if (Entity.isEntity(target) && Entity.getDatabase(target) === undefined) {
          this.#attach(target);
        }
      } else if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value !== null && typeof value === 'object') {
        Object.values(value).forEach(visit);
      }
    };
    visit(Object.values(entity));
    // Tagging an object adds its tags (held in its meta as entities or refs) to the database with it.
    for (const tag of Entity.getMeta(entity).tags ?? []) {
      if (Entity.isEntity(tag) && Entity.getDatabase(tag) === undefined) {
        this.#attach(tag);
      } else {
        visit(tag);
      }
    }
  }

  #markDirty(entity: Entity.Unknown): void {
    if (this.#closed || this.#detached.has(entity)) {
      return;
    }
    this.#dirty.set(entity.id, entity);
    this.#schedule();
  }

  /**
   * Batches the current turn's changes into one transaction, serialized now so later edits cannot leak
   * into it, and chains it behind earlier writes to keep them ordered. A failed batch is requeued.
   */
  #schedule(): void {
    if (this.#scheduled) {
      return;
    }
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      const batch = this.#dirty;
      const purged = [...this.#purged];
      const deletionChanged = this.#deletionChanged;
      this.#dirty = new Map();
      this.#purged.clear();
      this.#deletionChanged = false;
      if (batch.size === 0 && purged.length === 0 && this.#tombstones.size === 0) {
        return;
      }
      const tombstones = [...this.#tombstones];
      this.#tombstones.clear();
      // Items go to their feeds as whole JSON; everything else into its document.
      const items = new Map<string, { target: FeedTarget; json: Record<string, unknown>[] }>();
      const documents: Entity.Unknown[] = [];
      for (const entity of batch.values()) {
        const target = this.#items.get(entity);
        if (target) {
          const entry = items.get(target.feedId) ?? { target, json: [] };
          entry.json.push({ ...Entity.toJSON(entity) });
          items.set(target.feedId, entry);
        } else {
          documents.push(entity);
        }
      }
      for (const [id, target] of tombstones) {
        const entry = items.get(target.feedId) ?? { target, json: [] };
        entry.json.push({ id, '@deleted': true });
        items.set(target.feedId, entry);
      }
      const records = documents.flatMap((entity) => {
        const current = toRecord(entity, this.#spaceId, this.#ownDeleted.has(entity));
        const versions = this.#versions.get(entity.id) ?? [];
        this.#versions.delete(entity.id);
        const last = versions.at(-1);
        if (!last || JSON.stringify(last.body) !== JSON.stringify(current.body)) {
          versions.push(current);
        }
        // Only the first edit is made at the heads the object was read at; the rest follow it.
        return versions.map((version, index) => ({
          ...version,
          heads: index === 0 ? this.#heads.get(entity) : undefined,
        }));
      });
      const itemTypes = [...batch.values()]
        .filter((entity) => this.#items.has(entity))
        .map((entity) => Entity.getTypeURI(entity) ?? '');
      this.#writes = this.#writes.then(async () => {
        try {
          for (const { target, json } of items.values()) {
            await this.#run(this.#store.appendItems(target.feedId, target.namespace, json));
          }
          const { results, indexed } = await this.#run(this.#store.write(records, purged));
          for (const [id, result] of results) {
            const entity = batch.get(id);
            if (entity) {
              this.#heads.set(entity, result.heads);
              if (result.updatedAt !== undefined && Obj.isObject(entity)) {
                const updatedAt = result.updatedAt;
                // A derived field: setting it is not an edit, so it must not schedule another write.
                this.#stamping = true;
                try {
                  Obj.update(entity, (entity) => {
                    Obj.getMeta(entity).updatedAt = updatedAt;
                  });
                } finally {
                  this.#stamping = false;
                }
              }
            }
          }
          // A merged write, or blocks another writer appended meanwhile, leave documents ahead of
          // their live objects; an object this batch wrote unmerged already shows its document.
          const current = new Set([...results].filter(([, result]) => !result.merged).map(([id]) => id));
          await this.#refreshStale([...indexed].filter((id) => !current.has(id)));
          // Appended items and tombstones count too: a sibling's feed queries read them.
          await this.#announce(
            new Set([...indexed, ...results.keys(), ...batch.keys(), ...tombstones.map(([id]) => id)]),
          );
          // An appended item learns its block id and position from the row its block indexed into.
          for (const entity of batch.values()) {
            const target = this.#items.get(entity);
            if (target) {
              const stored = await this.#run(this.#store.loadItem(target.feedId, entity.id));
              if (stored) {
                this.#stampKeys(entity, stored);
              }
            }
          }
          // Deletion cascades and purges reach rows of any type, so they invalidate every query.
          const everything = deletionChanged || purged.length > 0;
          this.#committed.emit(
            new Set(
              everything || tombstones.length > 0
                ? [ANY_TYPE]
                : [...records.map((record) => record.typeDxn), ...itemTypes],
            ),
          );
        } catch (err) {
          log.error('failed to persist entities', { count: records.length, error: err });
          this.#writeError = err;
          // Requeue so memory and disk cannot silently diverge; newer changes to the same id win.
          for (const [id, entity] of batch) {
            if (!this.#dirty.has(id)) {
              this.#dirty.set(id, entity);
            }
          }
          purged.forEach((id) => this.#purged.add(id));
          for (const [id, target] of tombstones) {
            if (!this.#tombstones.has(id)) {
              this.#tombstones.set(id, target);
            }
          }
          this.#deletionChanged ||= deletionChanged;
        }
      });
    });
  }
}

const sameHeads = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((head) => right.includes(head));

/** The feed an item's blocks go to: the feed object's id, in its namespace. */
type FeedTarget = { readonly feedId: string; readonly namespace: string };

const feedTarget = (feed: Feed.Feed): FeedTarget => ({
  feedId: feed.id,
  namespace: feed.namespace ?? FeedProtocol.WellKnownNamespaces.data,
});

/** A stored body with the creation and last-change times the index holds, as the meta reads them. */
const withTimestamps = (stored: StoredEntity): Record<string, unknown> => {
  const meta = stored.body['@meta'];
  return {
    ...stored.body,
    '@meta': {
      ...(meta !== null && typeof meta === 'object' ? meta : {}),
      ...(stored.createdAt !== undefined && { createdAt: stored.createdAt }),
      ...(stored.updatedAt !== undefined && { updatedAt: stored.updatedAt }),
    },
  };
};

/** Replaces every field of a live object's meta with another meta's. */
const replaceMeta = (target: Record<string, unknown>, source: Record<string, unknown>): void => {
  for (const key of Object.keys(target)) {
    if (!Object.hasOwn(source, key)) {
      delete target[key];
    }
  }
  for (const [key, value] of Object.entries(source)) {
    target[key] = structuredClone(value);
  }
};

/** How often a database checks whether another connection committed to its file. */
const QUERY_POLL_MS = 100;

/** Marks a write batch that must invalidate every query. */
const ANY_TYPE = '*';

const typenameOf = (dxn: string): string => {
  const parsed = DXN.tryMake(dxn);
  return parsed ? DXN.getName(parsed) : dxn;
};

/**
 * The typenames a query's result can depend on, or undefined when any write could change it. Only
 * queries whose every select names a type, with no traversal, deletion cascade or parent relation
 * involved, are narrowed.
 */
const queryTypenames = (ast: QueryAST.Query): Set<string> | undefined => {
  switch (ast.type) {
    case 'select':
      return filterTypenames(ast.filter);
    case 'filter':
      return filterTypenames(ast.filter) === undefined ? undefined : queryTypenames(ast.selection);
    case 'options':
      // The deleted option pulls in cascades through parents and endpoints of any type.
      return ast.options.deleted === undefined ? queryTypenames(ast.query) : undefined;
    case 'order':
    case 'limit':
    case 'skip':
    case 'from':
      return queryTypenames(ast.query);
    case 'union': {
      const names = new Set<string>();
      for (const branch of ast.queries) {
        const branchNames = queryTypenames(branch);
        if (branchNames === undefined) {
          return undefined;
        }
        branchNames.forEach((name) => names.add(name));
      }
      return names;
    }
    default:
      return undefined;
  }
};

const filterTypenames = (filter: QueryAST.Filter): Set<string> | undefined => {
  if (filter.type === 'object' && filter.typename !== null && Object.values(filter.props).every(isLocal)) {
    return new Set([typenameOf(filter.typename)]);
  }
  if (filter.type === 'or' || filter.type === 'and') {
    const names = new Set<string>();
    for (const inner of filter.filters) {
      const innerNames = filterTypenames(inner);
      if (innerNames === undefined) {
        return undefined;
      }
      innerNames.forEach((name) => names.add(name));
    }
    return filter.type === 'or' || names.size > 0 ? names : undefined;
  }
  return undefined;
};

/** A property filter that reads only the row itself (no subquery over other types). */
const isLocal = (filter: QueryAST.Filter): boolean =>
  filter.type === 'in-query'
    ? false
    : filter.type === 'object'
      ? Object.values(filter.props).every(isLocal)
      : filter.type === 'not'
        ? isLocal(filter.filter)
        : filter.type === 'and' || filter.type === 'or'
          ? filter.filters.every(isLocal)
          : true;

const toAst = (queryOrFilter: Query.Any | Filter.Any): QueryAST.Query =>
  (Query.is(queryOrFilter) ? queryOrFilter : Query.select(queryOrFilter)).ast;

/** Whether a patch at `path` can change the value at `target`: one path is a prefix of the other. */
const overlaps = (path: readonly (string | number)[], target: readonly (string | number)[]): boolean => {
  const length = Math.min(path.length, target.length);
  for (let index = 0; index < length; index++) {
    if (path[index] !== target[index]) {
      return false;
    }
  }
  return true;
};

/** A snapshot of `entity`: the snapshot brand, and its id. */
const isSnapshotOf = <T extends Obj.Unknown>(entity: T, value: unknown): value is Obj.Snapshot<T> =>
  Obj.isSnapshot(value) && value.id === entity.id;
