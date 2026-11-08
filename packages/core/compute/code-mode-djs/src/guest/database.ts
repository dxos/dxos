//
// Copyright 2026 DXOS.org
//

import { type CleanupFn, Event } from '@dxos/async';
import {
  Blob,
  type Change,
  Database,
  Entity,
  type Feed,
  type Filter,
  type Hypergraph,
  type Migration,
  Obj,
  Query,
  Ref,
  Relation,
  Type,
} from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import {
  ATTR_PARENT,
  ObjectDatabaseId,
  ObjectDeletedId,
  type RefResolverRequest,
  type RefSource,
  SelfURIId,
  defineHiddenProperty,
  getRefSavedTarget,
  makeDecodedEntityLive,
  makeSettledRequest,
  objectFromJSON,
  setRefResolver,
  setRefResolverOnData,
} from '@dxos/echo/internal';
import { EID, type SpaceId, type URI } from '@dxos/keys';

import { type Row, type WriteRecord } from '../protocol.ts';
import { type GuestHost } from './host.ts';
import { BridgeQueryResult } from './query-result.ts';
import { GuestRegistry, matchRegistry } from './registry.ts';

/** A `Database` method the bridge does not carry. */
export class UnsupportedOperationError extends Error {
  constructor(operation: string) {
    super(`Not available in the code-mode sandbox: Database.${operation}`);
    this.name = 'UnsupportedOperationError';
  }
}

/** Counters a test reads to see what crossed the bridge. */
export type BridgeCounters = { queries: number; loads: number; writes: number; refreshes: number; hydrated: number };

/**
 * The guest's ECHO {@link Database.Database}: a working set over the host's database, reached through
 * synchronous bridge calls.
 *
 * Objects are hydrated from ECHO JSON rows into ordinary live objects, one per id, and observed with
 * `Entity.subscribe`; a change marks them dirty and they cross back as JSON records before the next
 * read, as `@dxos/echo-sqlite` writes behind to SQLite. Nothing here holds Automerge, a client, or a
 * channel: the host's database stays the only source of truth.
 */
export class BridgeDatabase implements Database.Database {
  readonly [Database.TypeId]: Database.TypeId = Database.TypeId;

  readonly #spaceId: SpaceId;
  readonly #host: () => GuestHost;
  readonly #registry: GuestRegistry;
  readonly #resolver: BridgeRefResolver;
  readonly #graph: BridgeHypergraph;

  /**
   * The working set. Held strongly: a session variable can hold any object across evaluations, and
   * the host's change markers are what keep each one current.
   */
  readonly #live = new Map<string, Entity.Unknown>();
  /** The host's version of each resident object, as of the last row or write. */
  readonly #versions = new Map<string, string>();
  readonly #subscriptions = new Map<string, CleanupFn>();
  readonly #dirty = new Map<string, Entity.Unknown>();
  /** Ids whose incoming row is being applied, so the change it causes is not written back. */
  readonly #applying = new Set<string>();

  readonly counters: BridgeCounters = { queries: 0, loads: 0, writes: 0, refreshes: 0, hydrated: 0 };

  constructor({ spaceId, host, registry }: { spaceId: SpaceId; host: () => GuestHost; registry: GuestRegistry }) {
    this.#spaceId = spaceId;
    this.#host = host;
    this.#registry = registry;
    this.#resolver = new BridgeRefResolver(this);
    this.#graph = new BridgeHypergraph(this, this.#resolver);
  }

  get spaceId(): SpaceId {
    return this.#spaceId;
  }

  get graph(): Hypergraph.Hypergraph {
    return this.#graph;
  }

  get registry(): GuestRegistry {
    return this.#registry;
  }

  toJSON(): object {
    return { spaceId: this.#spaceId, resident: this.#live.size };
  }

  //
  // Objects.
  //

  getObjectById<T extends Obj.Unknown = Obj.Unknown>(id: string, opts?: Database.GetObjectByIdOptions): T | undefined {
    const entity = this.#live.get(id);
    if (!entity || !Obj.isObject(entity) || (Entity.isDeleted(entity) && !opts?.deleted)) {
      return undefined;
    }
    // Callers name the expected type; the id lookup cannot check it.
    return entity as T;
  }

  add<T extends Entity.Unknown = Entity.Unknown>(obj: T & Database.RejectTypeEntity<T>, opts?: Database.AddOptions): T {
    if (opts?.to) {
      throw new UnsupportedOperationError('add to a feed');
    }
    if (Type.isType(obj)) {
      throw new TypeError('Type entities cannot be added from the sandbox.');
    }
    this.#attach(obj);
    return obj;
  }

  remove(obj: Entity.Unknown): void {
    if (Entity.getDatabase(obj) !== this) {
      throw new Error('Object is not in this database.');
    }
    if (Entity.isDeleted(obj)) {
      return;
    }
    defineHiddenProperty(obj, ObjectDeletedId, true);
    this.#dirty.set(obj.id, obj);
  }

  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref.Ref<T> {
    const ref = Ref.fromURI(uri);
    setRefResolver(ref, this.#resolver);
    return ref;
  }

  query: Database.QueryFn = ((queryOrFilter: Query.Any | Filter.Any) => {
    const ast = (Query.is(queryOrFilter) ? queryOrFilter : Query.select(queryOrFilter)).ast;
    return new BridgeQueryResult({
      source: 'local',
      execute: () => (isRegistryOnly(ast) ? matchRegistry(ast, this.#registry.list()) : this.#execute(ast)),
    });
    // The overloaded `QueryFn` cannot be satisfied by one generic implementation without a cast.
  }) as Database.QueryFn;

  /** The program's own flush: its writes reach the host and the host's storage, as in-process. */
  async flush(): Promise<void> {
    this.flushSync({ durable: true });
  }

  /** Writes every pending change to the host in one call; `durable` also waits for the host's storage. */
  flushSync({ durable = false }: { durable?: boolean } = {}): void {
    if (this.#dirty.size === 0 && !durable) {
      return;
    }
    const batch = [...this.#dirty.values()];
    this.#dirty.clear();
    const records = batch.map(toRecord);
    this.counters.writes++;
    const versions = this.#host().write(records, durable);
    for (const [id, version] of Object.entries(versions)) {
      this.#versions.set(id, version);
    }
  }

  //
  // Working set.
  //

  peek(uri: string): Entity.Unknown | undefined {
    const id = this.#localId(uri);
    return id === undefined ? undefined : this.#live.get(id);
  }

  async load(uri: string): Promise<Entity.Unknown | undefined> {
    const id = this.#localId(uri);
    const resident = id === undefined ? undefined : this.#live.get(id);
    if (resident) {
      return resident;
    }
    this.flushSync();
    this.counters.loads++;
    const row = this.#host().load(uri);
    return row ? this.hydrate(row) : undefined;
  }

  /** The live object for a row: the resident one, brought up to the row's version, or a new one. */
  async hydrate(row: Row): Promise<Entity.Unknown | undefined> {
    const resident = this.#live.get(row.id);
    if (resident) {
      if (this.#versions.get(row.id) !== row.version && !this.#dirty.has(row.id)) {
        await this.#apply(resident, row);
      }
      return resident;
    }
    const snapshot = await objectFromJSON(row.json, {
      refResolver: this.#resolver,
      uri: EID.make({ spaceId: this.#spaceId, entityId: row.id }),
      database: this,
    });
    const entity = makeDecodedEntityLive(snapshot);
    if (!Entity.isEntity(entity)) {
      return undefined;
    }
    // A concurrent hydration of the same id may have finished first.
    const raced = this.#live.get(row.id);
    if (raced) {
      return raced;
    }
    this.counters.hydrated++;
    this.#versions.set(row.id, row.version);
    this.#register(entity);
    return entity;
  }

  /**
   * Brings every resident object up to the host's version, and marks the ones the host no longer
   * has as deleted. Run before each evaluation, since the host may have changed them in between.
   */
  async refresh(): Promise<void> {
    this.flushSync();
    if (this.#live.size === 0) {
      return;
    }
    this.counters.refreshes++;
    const { rows, removed } = this.#host().refresh(Object.fromEntries(this.#versions));
    for (const row of rows) {
      await this.hydrate(row);
    }
    for (const id of removed) {
      const entity = this.#live.get(id);
      if (entity && !Entity.isDeleted(entity)) {
        defineHiddenProperty(entity, ObjectDeletedId, true);
      }
    }
  }

  /** Places rows the host already holds — a working-set export — without a bridge call. */
  async seed(rows: readonly Row[]): Promise<void> {
    for (const row of rows) {
      await this.hydrate(row);
    }
  }

  /** How many objects the working set holds. */
  get resident(): number {
    return this.#live.size;
  }

  async #execute(ast: QueryAST.Query): Promise<Entity.Unknown[]> {
    // Read-your-writes: the host answers from its own database, so it must hold the changes first.
    this.flushSync();
    this.counters.queries++;
    const rows = this.#host().query(ast);
    const entities: Entity.Unknown[] = [];
    for (const row of rows) {
      const entity = await this.hydrate(row);
      if (entity) {
        entities.push(entity);
      }
    }
    return entities;
  }

  /** Applies an incoming row's fields to the resident object, without writing them back. */
  async #apply(entity: Entity.Unknown, row: Row): Promise<void> {
    const snapshot = await objectFromJSON(row.json, {
      refResolver: this.#resolver,
      uri: EID.make({ spaceId: this.#spaceId, entityId: row.id }),
      database: this,
    });
    const incoming = dataOf(snapshot);
    this.#applying.add(row.id);
    try {
      if (Obj.isObject(entity)) {
        Obj.update(entity, (entity) => {
          for (const key of Object.keys(dataOf(entity))) {
            if (!(key in incoming)) {
              Reflect.deleteProperty(entity, key);
            }
          }
          for (const [key, value] of Object.entries(incoming)) {
            Reflect.set(entity, key, value);
          }
        });
      }
    } finally {
      this.#applying.delete(row.id);
    }
    this.#dirty.delete(row.id);
    this.#versions.set(row.id, row.version);
  }

  #attach(obj: Entity.Unknown): void {
    if (!Entity.isEntity(obj)) {
      throw new TypeError('Database.add expects an ECHO object. Create it with Obj.make(Type, props).');
    }
    const owner = Entity.getDatabase(obj);
    if (owner === this) {
      if (Entity.isDeleted(obj)) {
        // Re-adding a removed object restores it.
        defineHiddenProperty(obj, ObjectDeletedId, false);
        this.#dirty.set(obj.id, obj);
      }
      return;
    }
    if (owner !== undefined) {
      throw new Error('Object belongs to another database.');
    }
    const resident = this.#live.get(obj.id);
    if (resident !== undefined && resident !== obj) {
      throw new Error(`Another object with id ${obj.id} is in the database.`);
    }
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
    this.#dirty.set(obj.id, obj);
  }

  #register(entity: Entity.Unknown): void {
    const id = entity.id;
    this.#live.set(id, entity);
    this.#subscriptions.set(
      id,
      Entity.subscribe(entity, () => {
        if (!this.#applying.has(id)) {
          this.#adoptReferences(entity);
          this.#dirty.set(id, entity);
        }
      }),
    );
  }

  /** Makes refs the entity holds resolvable here, and adds their inline targets that are not stored yet. */
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

  #localId(uri: string): string | undefined {
    const eid = EID.tryParse(uri);
    if (!eid) {
      return undefined;
    }
    const space = EID.getSpaceId(eid);
    return space === undefined || space === this.#spaceId ? EID.getEntityId(eid) : undefined;
  }

  //
  // What the bridge does not carry.
  //

  async addType<T extends Type.AnyEntity>(_type: T): Promise<T> {
    throw new UnsupportedOperationError('addType');
  }

  async appendToFeed(_feed: Feed.Feed, _entities: Entity.Unknown[]): Promise<void> {
    throw new UnsupportedOperationError('appendToFeed');
  }

  async forkFeed(_feed: Feed.Feed, _base: Entity.Unknown): Promise<Feed.BranchId> {
    throw new UnsupportedOperationError('forkFeed');
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

  async beginMigration(): Promise<Migration.Transaction> {
    throw new UnsupportedOperationError('beginMigration');
  }

  getCurrentBranch(_objectId: string): string {
    return 'main';
  }

  getVersion<T extends Obj.Unknown>(_obj: T, _heads: readonly string[]): Obj.Snapshot<T> {
    throw new UnsupportedOperationError('getVersion');
  }

  getChanges<T extends Obj.Unknown>(_obj: T): Change.ValueChange<unknown>[] {
    throw new UnsupportedOperationError('getChanges');
  }

  listBranches(_objectId: string): string[] {
    return ['main'];
  }

  async createBranch(): Promise<void> {
    throw new UnsupportedOperationError('createBranch');
  }

  async switchBranch(): Promise<void> {
    throw new UnsupportedOperationError('switchBranch');
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

  async branch<T extends Obj.Unknown>(_obj: T, _name: string): Promise<Database.BranchBinding<T>> {
    throw new UnsupportedOperationError('branch');
  }

  async createBlob(): Promise<Blob.Blob> {
    throw new UnsupportedOperationError('createBlob');
  }

  async createBlobFromUpload(): Promise<Blob.Blob> {
    throw new UnsupportedOperationError('createBlobFromUpload');
  }

  async readBlob(): Promise<Uint8Array> {
    throw new UnsupportedOperationError('readBlob');
  }

  async blobExists(): Promise<boolean> {
    throw new UnsupportedOperationError('blobExists');
  }

  async getBlobUrl(): Promise<string | undefined> {
    throw new UnsupportedOperationError('getBlobUrl');
  }

  async getSyncState(): Promise<Database.SyncState> {
    throw new UnsupportedOperationError('getSyncState');
  }

  subscribeToSyncState(): CleanupFn {
    throw new UnsupportedOperationError('subscribeToSyncState');
  }

  async stats(): Promise<Database.DatabaseStats> {
    throw new UnsupportedOperationError('stats');
  }

  async runGarbageCollection(): Promise<Database.GarbageCollectionReport> {
    throw new UnsupportedOperationError('runGarbageCollection');
  }

  retainObjects(): string[] {
    throw new UnsupportedOperationError('retainObjects');
  }
}

/** Resolves refs against the guest database: from the working set, else by one `load` call. */
class BridgeRefResolver implements Ref.Resolver {
  readonly #db: BridgeDatabase;

  constructor(db: BridgeDatabase) {
    this.#db = db;
  }

  resolve(uri: URI.URI, options: { source: RefSource }): RefResolverRequest {
    const entity = this.resolveSync(uri, false);
    if (entity !== undefined || options.source === 'working-set') {
      return makeSettledRequest(entity ? 'ready' : 'unavailable', entity);
    }
    return new LoadRequest(this.resolveLegacy(uri));
  }

  resolveSync(uri: URI.URI, load: boolean, onLoad?: () => void): Entity.Unknown | undefined {
    const entity = this.#db.peek(uri) ?? this.#db.registry.getByURI(uri);
    if (entity === undefined && load) {
      void this.#db.load(uri).then((loaded) => loaded && onLoad?.());
    }
    return entity;
  }

  async resolveLegacy(uri: URI.URI): Promise<Entity.Unknown | undefined> {
    return this.#db.registry.getByURI(uri) ?? (await this.#db.load(uri));
  }

  async resolveSchema(uri: URI.URI) {
    const type = this.#db.registry.getByURI(uri);
    return type && Type.isType(type) ? Type.getSchema(type) : undefined;
  }

  async resolveType(uri: URI.URI): Promise<Entity.Unknown | undefined> {
    const type = this.#db.registry.getByURI(uri);
    return type && Type.isType(type) ? type : undefined;
  }
}

/** A resolution that settles when its row has been loaded and hydrated. */
class LoadRequest implements RefResolverRequest {
  state: RefResolverRequest['state'] = 'requesting';
  readonly stateChanged = new Event<void>();
  readonly #promise: Promise<Entity.Unknown | undefined>;
  #result: Entity.Unknown | undefined;

  constructor(promise: Promise<Entity.Unknown | undefined>) {
    this.#promise = promise.then(
      (result) => this.#settle(result),
      () => this.#settle(undefined),
    );
  }

  getResult(): Entity.Unknown | undefined {
    return this.state === 'ready' ? this.#result : undefined;
  }

  wait(): Promise<Entity.Unknown | undefined> {
    return this.#promise;
  }

  abort(): void {}

  #settle(result: Entity.Unknown | undefined): Entity.Unknown | undefined {
    this.#result = result;
    this.state = result ? 'ready' : 'unavailable';
    queueMicrotask(() => this.stateChanged.emit());
    return result;
  }
}

/** The single-database graph the guest database belongs to. */
class BridgeHypergraph implements Hypergraph.Hypergraph {
  readonly #db: BridgeDatabase;
  readonly #resolver: Ref.Resolver;

  constructor(db: BridgeDatabase, resolver: Ref.Resolver) {
    this.#db = db;
    this.#resolver = resolver;
  }

  get registry(): GuestRegistry {
    return this.#db.registry;
  }

  get defaultBlobStorage(): string {
    return Blob.Storage.inline;
  }

  get query(): Database.QueryFn {
    return this.#db.query;
  }

  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref.Ref<T> {
    return this.#db.makeRef<T>(uri);
  }

  createRefResolver(_options: Hypergraph.RefResolverOptions): Ref.Resolver {
    return this.#resolver;
  }

  getDatabase(spaceId: SpaceId): Database.Database | undefined {
    return spaceId === this.#db.spaceId ? this.#db : undefined;
  }

  registerBlobBackend(): CleanupFn {
    throw new UnsupportedOperationError('registerBlobBackend');
  }
}

/** A query that reads only the registry, which the guest answers itself. */
const isRegistryOnly = (ast: QueryAST.Query): boolean => {
  const scopes = ast.type === 'from' && ast.from._tag === 'scope' ? ast.from.scopes : undefined;
  return scopes !== undefined && scopes.every((scope) => scope._tag === 'registry');
};

/** Top-level JSON keys that describe the instance, not data an update carries. */
const SYSTEM_KEYS = new Set([
  'id',
  '@type',
  '@uri',
  '@meta',
  '@parent',
  '@relationSource',
  '@relationTarget',
  '@deleted',
]);

/** An entity's own data properties, without its system fields. */
const dataOf = (entity: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(entity).filter(([key]) => !SYSTEM_KEYS.has(key) && !key.startsWith('@')));

/** What the host writes for one entity: its ECHO JSON, with its parent, which `toJSON` leaves out. */
const toRecord = (entity: Entity.Unknown): WriteRecord => {
  const json: Record<string, unknown> = { ...Entity.toJSON(entity) };
  const parent = Obj.isObject(entity) ? Obj.getParent(entity) : undefined;
  if (parent) {
    json[ATTR_PARENT] = EID.make({ entityId: parent.id });
  }
  return { id: entity.id, json, deleted: Entity.isDeleted(entity) };
};
