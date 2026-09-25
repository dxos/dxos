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
import {
  ATTR_PARENT,
  ObjectDatabaseId,
  ObjectDeletedId,
  SelfURIId,
  defineHiddenProperty,
  getRefSavedTarget,
  makeDecodedEntityLive,
  makeSettledRequest,
  objectFromJSON,
  setRefResolver,
  setRefResolverOnData,
} from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { EID, SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';

import { type ObjectRecord, ObjectStore } from './object-store.ts';
import { type QuerySource, executeQuery } from './query-engine.ts';
import { LiveQueryResult } from './query-result.ts';
import { SimpleRegistry } from './registry.ts';

/**
 * Raised by the parts of the `Database` interface this backend deliberately leaves out
 * (feeds, branches, history, external blob storage).
 */
export class UnsupportedOperationError extends Error {
  constructor(operation: string) {
    super(`Not supported by echo-sqlite: ${operation}`);
    this.name = 'UnsupportedOperationError';
  }
}

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

type Tracked = {
  readonly entity: Entity.Unknown;
  readonly unsubscribe: CleanupFn;
  createdAt: number;
  updatedAt: number;
};

/**
 * ECHO {@link Database.Database} backed by a single SQLite table.
 *
 * Every entity of the space is resident as an ordinary in-memory live object (`Obj.make` proxy), so
 * reads and queries are synchronous scans. Mutations are observed with `Obj.subscribe` and written
 * behind to SQLite as whole JSON rows, batched per microtask; {@link flush} awaits the writes.
 * There is no Automerge, no feed, no replication and no client/host split.
 */
export class SqliteDatabase implements Database.Database {
  readonly [Database.TypeId]: Database.TypeId = Database.TypeId;

  readonly #spaceId: SpaceId;
  readonly #store: ObjectStore;
  readonly #run: <A>(effect: Effect.Effect<A, SqlError.SqlError, SqlClient.SqlClient>) => Promise<A>;
  readonly #registry: SimpleRegistry;
  readonly #graph: SqliteHypergraph;
  readonly #resolver: Ref.Resolver;
  readonly #querySource: QuerySource;

  readonly #tracked = new Map<string, Tracked>();
  /** Stored rows not yet materialized while the database is opening. */
  readonly #records = new Map<string, ObjectRecord>();
  readonly #hydrating = new Map<string, Promise<Entity.Unknown | undefined>>();

  readonly #changed = new Event<void>();
  readonly #dirty = new Set<string>();
  readonly #purged = new Set<string>();
  #scheduled = false;
  #writes: Promise<void> = Promise.resolve();
  #writeError: unknown = undefined;
  #closed = false;

  private constructor(
    spaceId: SpaceId,
    run: <A>(effect: Effect.Effect<A, SqlError.SqlError, SqlClient.SqlClient>) => Promise<A>,
    types: readonly Type.AnyEntity[],
  ) {
    this.#spaceId = spaceId;
    this.#store = new ObjectStore(spaceId);
    this.#run = run;
    // The meta-type is registered so persisted `Type.Type` rows decode.
    this.#registry = new SimpleRegistry([Type.Type, ...types]);
    this.#graph = new SqliteHypergraph(this);
    this.#resolver = new DatabaseRefResolver(this);
    this.#querySource = {
      spaceId,
      entities: () => [...this.#tracked.values()].map(({ entity }) => entity),
      getEntity: (id) => this.#tracked.get(id)?.entity,
      getTimestamps: (id) => this.#tracked.get(id),
      registryEntities: () => this.#registry.list(),
    };
  }

  /**
   * Opens (creating if needed) the database for a space, loading every stored entity into memory.
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
        const records = yield* db.#store.list();
        yield* Effect.promise(() => db.#load(records));
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
   * Fires (batched per microtask) after any entity is added, removed or mutated.
   */
  get changed(): Event<void> {
    return this.#changed;
  }

  toJSON(): object {
    return { spaceId: this.#spaceId, objects: this.#tracked.size };
  }

  /**
   * Flushes pending writes and stops observing objects. Idempotent.
   */
  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }
    await this.flush();
    this.#closed = true;
    for (const tracked of this.#tracked.values()) {
      tracked.unsubscribe();
    }
  }

  //
  // Objects.
  //

  getObjectById<T extends Obj.Unknown = Obj.Unknown>(id: string, opts?: Database.GetObjectByIdOptions): T | undefined {
    const entity = this.#tracked.get(id)?.entity;
    if (!entity || (Entity.isDeleted(entity) && !opts?.deleted) || !Obj.isObject(entity)) {
      return undefined;
    }
    // Callers name the expected type; the id lookup cannot check it.
    return entity as T;
  }

  /**
   * Any tracked entity (object, relation or type), deleted ones included.
   */
  getEntity(id: string): Entity.Unknown | undefined {
    return this.#tracked.get(id)?.entity;
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
    const existing = [...this.#tracked.values()].find(
      ({ entity }) =>
        Type.isType(entity) &&
        !Entity.isDeleted(entity) &&
        Type.getTypename(entity) === typename &&
        Type.getVersion(entity) === version,
    );
    if (existing) {
      // Matched on typename + version, which is what identifies the caller's `T`.
      return existing.entity as T;
    }

    // Static types carry an Effect schema rather than stored JSON Schema, so persist a copy built from it.
    const persisted = Type.makeObjectFromJsonSchema({
      typename,
      version,
      jsonSchema: JsonSchema.toJsonSchema(Type.getSchema(type)),
    });
    this.#attach(persisted);
    this.#registry.add([persisted]);
    // The stored copy stands in for the caller's type of the same typename + version.
    return persisted as T;
  }

  remove(obj: Entity.Unknown): void {
    const tracked = this.#tracked.get(obj.id);
    invariant(tracked?.entity === obj, 'Object is not in this database.');
    if (Entity.isDeleted(obj)) {
      return;
    }
    defineHiddenProperty(obj, ObjectDeletedId, true);
    if (Type.isType(obj)) {
      this.#registry.remove(obj.id);
    }
    this.#markDirty(obj.id);
  }

  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref.Ref<T> {
    const ref = Ref.fromURI(uri);
    setRefResolver(ref, this.#resolver);
    return ref;
  }

  query: Database.QueryFn = ((queryOrFilter: Query.Any | Filter.Any) =>
    new LiveQueryResult({
      ast: (Query.is(queryOrFilter) ? queryOrFilter : Query.select(queryOrFilter)).ast,
      changed: this.#changed,
      source: 'local',
      evaluate: (ast) => executeQuery(this.#querySource, ast),
      // The overloaded `QueryFn` cannot be satisfied by one generic implementation without a cast.
    })) as Database.QueryFn;

  async flush(_opts?: Database.FlushOptions): Promise<void> {
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
    const entities = [...this.#tracked.values()].map(({ entity }) => entity);
    const deleted = entities.filter((entity) => Entity.isDeleted(entity)).length;
    return {
      objects: { alive: entities.length - deleted, deleted },
      documents: 0,
      feeds: 0,
      feedBlocks: 0,
      loaded: {
        client: {
          documents: 0,
          objects: entities.length,
          feeds: 0,
          feedObjects: 0,
          registryTotal: this.#registry.list().length,
        },
        host: { documents: 0, documentsTotal: 0, queriesTotal: 0, leases: 0 },
      },
    };
  }

  /**
   * Permanently drops soft-deleted entities from memory and storage.
   */
  async runGarbageCollection(_options?: Database.GarbageCollectionOptions): Promise<Database.GarbageCollectionReport> {
    const ids = [...this.#tracked.values()]
      .filter(({ entity }) => Entity.isDeleted(entity))
      .map(({ entity }) => entity.id);
    this.#purge(ids);
    await this.flush();
    return { unlinkedObjects: ids.length, removedDocuments: 0, removedIndexEntries: ids.length, purgedFeedBlocks: 0 };
  }

  retainObjects(keep: Iterable<string>): string[] {
    const retained = new Set(keep);
    const ids = [...this.#tracked.keys()].filter((id) => !retained.has(id));
    this.#purge(ids);
    return ids;
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
    return `data:${blob.type ?? 'application/octet-stream'};base64,${btoa(String.fromCharCode(...blob.data.bytes))}`;
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
  // Internals.
  //

  /**
   * Resolves an entity URI (`echo:///<id>` or `echo://<space>/<id>`) against the working set.
   */
  lookup(uri: string): Entity.Unknown | undefined {
    const id = this.#entityIdOf(uri);
    return id ? this.#tracked.get(id)?.entity : undefined;
  }

  /**
   * {@link lookup}, materializing the row first when the database is still opening.
   */
  async load(uri: string): Promise<Entity.Unknown | undefined> {
    const id = this.#entityIdOf(uri);
    return id ? (this.#tracked.get(id)?.entity ?? this.#hydrate(id)) : undefined;
  }

  get resolver(): Ref.Resolver {
    return this.#resolver;
  }

  #entityIdOf(uri: string): string | undefined {
    const eid = EID.tryParse(uri);
    if (!eid) {
      return undefined;
    }
    const spaceId = EID.getSpaceId(eid);
    return spaceId === undefined || spaceId === this.#spaceId ? EID.getEntityId(eid) : undefined;
  }

  async #load(records: readonly ObjectRecord[]): Promise<void> {
    records.forEach((record) => this.#records.set(record.id, record));
    // Types first, so objects of persisted types find their schema.
    for (const record of records.filter((record) => record.kind === Entity.Kind.Type)) {
      await this.#hydrate(record.id);
    }
    for (const record of records) {
      await this.#hydrate(record.id);
    }
    this.#records.clear();
  }

  #hydrate(id: string): Promise<Entity.Unknown | undefined> {
    const record = this.#records.get(id);
    if (!record) {
      return Promise.resolve(this.#tracked.get(id)?.entity);
    }
    let hydrating = this.#hydrating.get(id);
    if (!hydrating) {
      hydrating = (async () => {
        try {
          const snapshot = await objectFromJSON(record.data, {
            refResolver: this.#resolver,
            uri: EID.make({ spaceId: this.#spaceId, entityId: id }),
            database: this,
          });
          const entity = makeDecodedEntityLive(snapshot);
          invariant(Entity.isEntity(entity));
          this.#records.delete(id);
          this.#track(entity, record.createdAt, record.updatedAt);
          if (Type.isType(entity) && !record.deleted) {
            this.#registry.add([entity]);
          }
          return entity;
        } catch (err) {
          log.warn('failed to load object; skipped', { id, typename: record.typename, error: err });
          this.#records.delete(id);
          return undefined;
        }
      })();
      this.#hydrating.set(id, hydrating);
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

    const existing = this.#tracked.get(obj.id);
    if (existing) {
      invariant(existing.entity === obj, `Another object with id ${obj.id} is already in the database.`);
      if (Entity.isDeleted(obj)) {
        // Re-adding a removed object restores it.
        defineHiddenProperty(obj, ObjectDeletedId, false);
        if (Type.isType(obj)) {
          this.#registry.add([obj]);
        }
        this.#markDirty(obj.id);
      }
      return;
    }

    const owner = Entity.getDatabase(obj);
    invariant(owner === undefined || owner === this, 'Object belongs to another database.');

    if (Relation.isRelation(obj)) {
      for (const endpoint of [Relation.getSource(obj), Relation.getTarget(obj)]) {
        if (Entity.isEntity(endpoint) && !this.#tracked.has(endpoint.id)) {
          this.#attach(endpoint);
        }
      }
    }

    defineHiddenProperty(obj, SelfURIId, EID.make({ spaceId: this.#spaceId, entityId: obj.id }));
    defineHiddenProperty(obj, ObjectDatabaseId, this);
    const now = Date.now();
    this.#track(obj, now, now);
    this.#adoptReferences(obj);
    this.#markDirty(obj.id);
  }

  #track(entity: Entity.Unknown, createdAt: number, updatedAt: number): void {
    const unsubscribe = Entity.subscribe(entity, () => {
      this.#adoptReferences(entity);
      this.#markDirty(entity.id);
    });
    this.#tracked.set(entity.id, { entity, unsubscribe, createdAt, updatedAt });
  }

  /**
   * Makes refs held by the entity resolvable here, and adds their inline targets that are not stored yet,
   * so a graph built with `Ref.make` persists as a whole.
   */
  #adoptReferences(entity: Entity.Unknown): void {
    setRefResolverOnData(entity, this.#resolver);
    const visit = (value: unknown): void => {
      if (Ref.isRef(value)) {
        const target = getRefSavedTarget(value);
        if (Entity.isEntity(target) && !this.#tracked.has(target.id) && Entity.getDatabase(target) === undefined) {
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

  #markDirty(id: string): void {
    const tracked = this.#tracked.get(id);
    if (tracked) {
      tracked.updatedAt = Math.max(Date.now(), tracked.updatedAt);
    }
    this.#dirty.add(id);
    this.#schedule();
  }

  #purge(ids: readonly string[]): void {
    for (const id of ids) {
      const tracked = this.#tracked.get(id);
      if (!tracked) {
        continue;
      }
      tracked.unsubscribe();
      this.#tracked.delete(id);
      this.#registry.remove(id);
      this.#dirty.delete(id);
      this.#purged.add(id);
    }
    this.#schedule();
  }

  /**
   * Batches the current turn's changes into one transaction, serialized now so later edits cannot
   * leak into it, and chains it behind earlier writes to keep them ordered.
   */
  #schedule(): void {
    if (this.#scheduled) {
      return;
    }
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      const records = [...this.#dirty].flatMap((id) => {
        const tracked = this.#tracked.get(id);
        return tracked ? [this.#serialize(tracked)] : [];
      });
      const purged = [...this.#purged];
      this.#dirty.clear();
      this.#purged.clear();
      this.#changed.emit();

      if (this.#closed || (records.length === 0 && purged.length === 0)) {
        return;
      }
      this.#writes = this.#writes.then(async () => {
        try {
          await this.#run(Effect.andThen(this.#store.write(records), this.#store.delete(purged)));
        } catch (err) {
          log.error('failed to persist objects', { count: records.length, error: err });
          this.#writeError = err;
        }
      });
    });
  }

  #serialize({ entity, createdAt, updatedAt }: Tracked): ObjectRecord {
    const data: Record<string, unknown> = { ...Entity.toJSON(entity) };
    const parent = Obj.isObject(entity) ? Obj.getParent(entity) : undefined;
    if (parent) {
      data[ATTR_PARENT] = EID.make({ entityId: parent.id });
    }
    return {
      id: entity.id,
      kind: Type.isType(entity)
        ? Entity.Kind.Type
        : Relation.isRelation(entity)
          ? Entity.Kind.Relation
          : Entity.Kind.Object,
      typename: Entity.getTypeURI(entity) ?? '',
      deleted: Entity.isDeleted(entity),
      data,
      createdAt,
      updatedAt,
    };
  }
}

/**
 * Resolves refs against one {@link SqliteDatabase} and its registry.
 */
class DatabaseRefResolver implements Ref.Resolver {
  constructor(private readonly _db: SqliteDatabase) {}

  resolve(uri: URI.URI): ReturnType<Ref.Resolver['resolve']> {
    const entity = this.resolveSync(uri);
    return makeSettledRequest(entity ? 'ready' : 'unavailable', entity);
  }

  resolveSync(uri: URI.URI): Entity.Unknown | undefined {
    return this._db.lookup(uri) ?? this._db.registry.getByURI(uri);
  }

  async resolveLegacy(uri: URI.URI): Promise<Entity.Unknown | undefined> {
    return (await this._db.load(uri)) ?? this._db.registry.getByURI(uri);
  }

  async resolveSchema(uri: URI.URI) {
    const type = this._db.registry.getByURI(uri);
    return type && Type.isType(type) ? Type.getSchema(type) : undefined;
  }

  async resolveType(uri: URI.URI): Promise<Entity.Unknown | undefined> {
    const type = this._db.registry.getByURI(uri);
    return type && Type.isType(type) ? type : undefined;
  }
}

/**
 * The single-database graph a {@link SqliteDatabase} belongs to.
 */
class SqliteHypergraph implements Hypergraph.Hypergraph {
  constructor(private readonly _db: SqliteDatabase) {}

  get registry(): SimpleRegistry {
    return this._db.registry;
  }

  get defaultBlobStorage(): string {
    return Blob.Storage.inline;
  }

  get query(): Database.QueryFn {
    return this._db.query;
  }

  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref.Ref<T> {
    return this._db.makeRef<T>(uri);
  }

  createRefResolver(_options: Hypergraph.RefResolverOptions): Ref.Resolver {
    return this._db.resolver;
  }

  getDatabase(spaceId: SpaceId): Database.Database | undefined {
    return spaceId === this._db.spaceId ? this._db : undefined;
  }

  registerBlobBackend(): CleanupFn {
    throw new UnsupportedOperationError('registerBlobBackend');
  }
}
