//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { type CleanupFn, Event } from '@dxos/async';
import {
  Blob,
  Database,
  Error as EchoError,
  Entity,
  type Feed,
  type Filter,
  type Hypergraph,
  JsonSchema,
  Obj,
  Query,
  Ref,
  Relation,
  Type,
} from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import {
  ObjectDatabaseId,
  ObjectDeletedId,
  SelfURIId,
  defineHiddenProperty,
  getRefSavedTarget,
  makeDecodedEntityLive,
  objectFromJSON,
  setRefResolver,
  setRefResolverOnData,
} from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { DXN, EID, SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';

import { UnsupportedOperationError } from './errors.ts';
import { DatabaseRefResolver, type EntitySource, SqliteHypergraph } from './graph.ts';
import { ObjectStore, type StoredEntity } from './object-store.ts';
import { LiveQueryResult } from './query-result.ts';
import { localEntityId, toRecord } from './record.ts';
import { SimpleRegistry, matchRegistry } from './registry.ts';
import { type CompiledQuery, compileQuery } from './sql/compile.ts';

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

type Run = <A>(effect: Effect.Effect<A, SqlError.SqlError, SqlClient.SqlClient>) => Promise<A>;

/**
 * ECHO {@link Database.Database} backed by SQLite, which is the source of truth: the space is never
 * resident. Queries compile to one SQL statement and hydrate only their result rows; refs load their
 * single target row. Hydrated objects are ordinary live objects held weakly, so an object nobody holds
 * is garbage-collected; mutations are observed with `Entity.subscribe` and written behind, batched per
 * microtask, and held strongly until durable.
 */
export class SqliteDatabase implements Database.Database, EntitySource {
  readonly [Database.TypeId]: Database.TypeId = Database.TypeId;

  readonly #spaceId: SpaceId;
  readonly #store: ObjectStore;
  readonly #run: Run;
  readonly #registry: SimpleRegistry;
  readonly #resolver: DatabaseRefResolver;
  readonly #graph: SqliteHypergraph;

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
  /** Persisted type entities; few, and needed to hydrate anything, so held for the database's life. */
  readonly #types = new Map<string, Entity.Unknown>();

  /** Changed entities, held strongly until their write is durable. */
  #dirty = new Map<string, Entity.Unknown>();
  #purged = new Set<string>();
  /** A delete or restore in the pending batch: the cascade can hide rows of any type. */
  #deletionChanged = false;
  #scheduled = false;
  #writes: Promise<void> = Promise.resolve();
  #writeError: unknown = undefined;
  #closed = false;

  /** Fires with the type DXNs of each committed write batch; subscribed queries re-execute on it. */
  readonly #committed = new Event<ReadonlySet<string>>();
  readonly #counters = { hydrated: 0, queries: 0, loads: 0 };

  private constructor(spaceId: SpaceId, run: Run, types: readonly Type.AnyEntity[]) {
    this.#spaceId = spaceId;
    this.#store = new ObjectStore(spaceId);
    this.#run = run;
    // The meta-type is registered so persisted `Type.Type` rows decode.
    this.#registry = new SimpleRegistry([Type.Type, ...types]);
    this.#resolver = new DatabaseRefResolver(this);
    this.#graph = new SqliteHypergraph(this, this.#resolver);
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
        const db = new SqliteDatabase(
          options.spaceId ?? SpaceId.random(),
          Effect.runPromiseWith(context),
          options.types ?? [],
        );
        yield* db.#store.migrate();
        const types = yield* db.#store.loadTypes();
        yield* Effect.promise(() => db.#registerTypes(types));
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
      throw new UnsupportedOperationError('add to feed');
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
    if (Entity.isDeleted(obj)) {
      return;
    }
    defineHiddenProperty(obj, ObjectDeletedId, true);
    if (Type.isType(obj)) {
      this.#registry.remove(obj.id);
    }
    this.#deletionChanged = true;
    this.#markDirty(obj);
  }

  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref.Ref<T> {
    const ref = Ref.fromURI(uri);
    setRefResolver(ref, this.#resolver);
    return ref;
  }

  query: Database.QueryFn = ((queryOrFilter: Query.Any | Filter.Any) => {
    const ast = toAst(queryOrFilter);
    const scopes = ast.type === 'from' && ast.from._tag === 'scope' ? ast.from.scopes : undefined;
    const fromRegistry = scopes?.some((scope) => scope._tag === 'registry' && scope.location === 'local') ?? false;
    const fromSpace = scopes === undefined || scopes.some((scope) => scope._tag !== 'registry');
    // Compiled up front: compilation is pure, and an unsupported clause should fail at the call site.
    const compiled = fromSpace ? compileQuery(ast, { spaceId: this.#spaceId }) : undefined;
    const typenames = queryTypenames(ast);
    return new LiveQueryResult({
      source: 'local',
      invalidated: this.#committed,
      affectedBy: (written) =>
        typenames === undefined || written.has(ANY_TYPE) || [...written].some((dxn) => typenames.has(typenameOf(dxn))),
      execute: async () => {
        const stored = compiled ? await this.#execute(compiled) : [];
        const registered = fromRegistry && ast.type === 'from' ? matchRegistry(ast.query, this.#registry.list()) : [];
        return [...stored, ...registered.filter((entity) => !stored.includes(entity))];
      },
    });
    // The overloaded `QueryFn` cannot be satisfied by one generic implementation without a cast.
  }) as Database.QueryFn;

  async flush(_opts?: Database.FlushOptions): Promise<void> {
    // A failed batch is requeued without rescheduling, so flushing is what retries it.
    this.#writeError = undefined;
    if (this.#dirty.size > 0 || this.#purged.size > 0) {
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
   * Permanently removes rows whose own deleted flag is set, with their reference and text rows.
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
    return { unlinkedObjects: ids.length, removedDocuments: 0, removedIndexEntries: ids.length, purgedFeedBlocks: 0 };
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

  getVersion<T extends Obj.Unknown>(_obj: T, _heads: readonly string[]): Obj.Snapshot<T> {
    throw new UnsupportedOperationError('getVersion');
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
  // Feeds are out of scope.
  //

  async appendToFeed(_feed: Feed.Feed, _entities: Entity.Unknown[]): Promise<void> {
    throw new UnsupportedOperationError('appendToFeed');
  }

  async deleteFromFeed(_feed: Feed.Feed, _entities: Entity.Unknown[]): Promise<void> {
    throw new UnsupportedOperationError('deleteFromFeed');
  }

  async removeFeedItemsByIds(_feed: Feed.Feed, _ids: string[]): Promise<void> {
    throw new UnsupportedOperationError('removeFeedItemsByIds');
  }

  async syncFeed(_feed: Feed.Feed, _options?: Feed.SyncOptions): Promise<void> {
    throw new UnsupportedOperationError('syncFeed');
  }

  async getFeedSyncState(_feed: Feed.Feed): Promise<Feed.SyncState> {
    throw new UnsupportedOperationError('getFeedSyncState');
  }

  async evictFeedHandle(_feed: Feed.Feed): Promise<void> {
    throw new UnsupportedOperationError('evictFeedHandle');
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
  async #execute(compiled: CompiledQuery): Promise<Entity.Unknown[]> {
    await this.flush();
    this.#counters.queries++;
    const rows = await this.#run(this.#store.query(compiled));
    const entities = await Promise.all(rows.map((row) => this.#hydrate(row)));
    return entities.filter((entity): entity is Entity.Unknown => entity !== undefined);
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
          const snapshot = await objectFromJSON(stored.body, {
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
          this.#register(entity);
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
   * Binds a live entity (and any unstored entities it references) to this database.
   */
  #attach(obj: Entity.Unknown): void {
    if (!Entity.isEntity(obj)) {
      throw new TypeError('db.add expects a live ECHO object. Create it with Obj.make(Type, props).');
    }
    const owner = Entity.getDatabase(obj);
    if (owner === this) {
      if (Entity.isDeleted(obj)) {
        // Re-adding a removed object restores it.
        defineHiddenProperty(obj, ObjectDeletedId, false);
        if (Type.isType(obj)) {
          this.#registry.add([obj]);
        }
        this.#deletionChanged = true;
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

    defineHiddenProperty(obj, SelfURIId, EID.make({ spaceId: this.#spaceId, entityId: obj.id }));
    defineHiddenProperty(obj, ObjectDatabaseId, this);
    this.#register(obj);
    this.#adoptReferences(obj);
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
  }

  #onChanged(id: string): void {
    const entity = this.#live.get(id)?.deref();
    if (entity) {
      this.#adoptReferences(entity);
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
  }

  #markDirty(entity: Entity.Unknown): void {
    if (this.#closed) {
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
      if (batch.size === 0 && purged.length === 0) {
        return;
      }
      const records = [...batch.values()].map((entity) => toRecord(entity, this.#spaceId));
      this.#writes = this.#writes.then(async () => {
        try {
          await this.#run(this.#store.write(records, purged));
          // Deletion cascades and purges reach rows of any type, so they invalidate every query.
          const everything = deletionChanged || purged.length > 0;
          this.#committed.emit(new Set(everything ? [ANY_TYPE] : records.map((record) => record.typeDxn)));
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
          this.#deletionChanged ||= deletionChanged;
        }
      });
    });
  }
}

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
