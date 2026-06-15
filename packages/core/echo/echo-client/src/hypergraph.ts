//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { StackTrace } from '@dxos/debug';
import { type Database, type Entity, Feed, Filter, type Hypergraph, Query, Ref, type Registry, Type } from '@dxos/echo';
import {
  batchEvents,
  type AnyProperties,
  getStrongDependencies,
  type RefResolverRequest,
  type RefSource,
  setRefResolver,
} from '@dxos/echo/internal';
import { DXN, EID, type EntityId, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { entry } from '@dxos/util';

import { type ItemsUpdatedEvent } from './core-db';
import { type LoadBackend, type LoadResult, LoadOpTable } from './core-db/load-op';
import { RequestImpl } from './core-db/ref-resolver-request';
import { type DatabaseImpl } from './proxy-db';
import {
  GraphQueryContext,
  type QueryContext,
  QueryResultCache,
  QueryResultImpl,
  type QuerySource,
  RegistryQuerySource,
  SpaceQuerySource,
} from './query';
import type { Queue, QueueFactory } from './queue';
import { makeRegistry } from './registry';

const TRACE_REF_RESOLUTION = false;

/**
 * Manages cross-space database interactions.
 */
export class HypergraphImpl implements Hypergraph.Hypergraph {
  private readonly _databases = new Map<SpaceId, DatabaseImpl>();
  private readonly _queueFactories = new Map<SpaceId, QueueFactory>();

  // TODO(burdon): Space dependency?
  private readonly _owningObjects = new Map<SpaceId, unknown>();
  private readonly _registry: Registry.Registry;
  private readonly _updateEvent = new Event<ItemsUpdatedEvent>();
  private readonly _resolveEvents = new Map<SpaceId, Map<string, Event<Entity.Any>>>();
  private readonly _queryContexts = new Set<GraphQueryContext>();
  private readonly _querySourceProviders: QuerySourceProvider[] = [];

  // Shares one QueryResult instance (and its subscription) across repeated calls with the same
  // serialized query. Covers both graph and database queries since `DatabaseImpl.query`
  // normalizes scope and delegates here.
  //
  // Replaced (not mutated) on every database registration change: each `QueryResultImpl` embeds
  // a `GraphQueryContext` snapshot of the database set at creation time. Active (subscribed)
  // results stay valid because `_registerDatabase` pushes new sources into `_queryContexts`.
  // Idle (unsubscribed) cached results would not receive those updates and would miss newly
  // registered databases, so we discard them on every topology change.
  #queryResultCache = new QueryResultCache();

  // Coalesced per-URI body loading shared by all resolution requests. Routed to a backend by URI
  // kind / space; closure satisfaction lives in the per-call `RequestImpl`s.
  readonly #loadOpTable = new LoadOpTable((uri) => this.#routeBackend(uri));
  readonly #spaceBackends = new Map<SpaceId, LoadBackend>();
  #crossSpaceBackend: LoadBackend | undefined;

  constructor() {
    this._registry = makeRegistry();
    this._registry.add([Type.Type]);
  }

  get registry(): Registry.Registry {
    return this._registry;
  }

  /**
   * Register a database.
   * @param spaceId Space id.
   * @param spaceKey Space key.
   * @param database Database backend.
   * @param owningObject Database owner, usually a space.
   */
  _registerDatabase(
    spaceId: SpaceId,
    /** @deprecated Use spaceId */
    database: DatabaseImpl,
    owningObject?: unknown,
  ): void {
    this._databases.set(spaceId, database);
    this._owningObjects.set(spaceId, owningObject);
    database.coreDatabase._updateEvent.on(this._onUpdate.bind(this));

    const map = this._resolveEvents.get(spaceId);
    if (map) {
      for (const [id, event] of map) {
        const obj = database.getObjectById(id);
        if (obj) {
          log('resolve', { spaceId, objectId: id });
          event.emit(obj);
          map.delete(id);
        }
      }
    }

    for (const context of this._queryContexts.values()) {
      context.addQuerySource(new SpaceQuerySource(database));
    }
    this.#queryResultCache = new QueryResultCache();
  }

  /**
   * @internal
   */
  _unregisterDatabase(spaceId: SpaceId): void {
    // TODO(dmaretskyi): Remove db from query contexts.
    this._databases.delete(spaceId);
    this.#queryResultCache = new QueryResultCache();
  }

  /**
   * @internal
   */
  _registerQueueFactory(spaceId: SpaceId, factory: QueueFactory): void {
    this._queueFactories.set(spaceId, factory);
  }

  /**
   * @internal
   */
  _unregisterQueueFactory(spaceId: SpaceId): void {
    this._queueFactories.delete(spaceId);
  }

  _getOwningObject(spaceId: SpaceId): unknown | undefined {
    return this._owningObjects.get(spaceId);
  }

  // Odd way to define methods types from a typedef.
  declare query: Database.QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(queryOrFilter: Query.Any | Filter.Any) {
    const query = Filter.is(queryOrFilter) ? Query.select(queryOrFilter) : queryOrFilter;
    return this.#queryResultCache.getOrCreate(
      query,
      () => new QueryResultImpl(this._createLiveObjectQueryContext(), query),
    );
  }

  /**
   * Creates a reference to an existing object in the database.
   *
   * NOTE: The reference may be dangling if the object is not present in the database.
   *
   * ## Difference from `Ref.fromURI`
   *
   * `Ref.fromURI(dxn)` returns an unhydrated reference. The `.load` and `.target` APIs will not work.
   * `graph.ref(dxn)` is preferable in cases with access to the database.
   *
   */
  makeRef<T extends AnyProperties = any>(uri: URI.URI): Ref.Ref<T> {
    const ref = Ref.fromURI(uri);
    setRefResolver(ref, this.createRefResolver({}));
    return ref;
  }

  getDatabase(spaceId: SpaceId): DatabaseImpl | undefined {
    return this._databases.get(spaceId);
  }

  /**
   * @param hostDb Host database for reference resolution.
   * @param middleware Called with the loaded object. The caller may change the object.
   * @returns Result of `onLoad`.
   */
  createRefResolver({ context = {}, middleware = (obj) => obj }: Hypergraph.RefResolverOptions): Ref.Resolver {
    // TODO(dmaretskyi): Rewrite resolution algorithm with tracks for absolute and relative DXNs.

    return {
      resolve: (uri: URI.URI, { source }: { source: RefSource }): RefResolverRequest => {
        const root = this.#loadOpTable.acquire(uri, source);
        return new RequestImpl(this.#loadOpTable, root, source);
      },

      // TODO(dmaretskyi): Respect `load` flag.
      resolveSync: (uri: URI.URI, load: boolean, onLoad?: () => void) => {
        if (EID.isEID(uri)) {
          const res = this._resolveSync(uri, context, onLoad);
          return res ? middleware(res) : undefined;
        }

        // Registry refs (DXNs) resolve to the entity held in the registry — a type entity by
        // typename DXN, or a keyed entity (operation, blueprint, etc.) by its key DXN.
        if (DXN.isDXN(uri)) {
          const entity = this._registry.getByURI(uri.toString());
          return entity ? middleware(entity) : undefined;
        }

        return undefined; // Unsupported URI kind.
      },

      resolveLegacy: async (uri) => {
        const obj = await this._resolveAsync(uri, context);
        if (obj) {
          return middleware(obj);
        } else {
          return undefined;
        }
      },

      resolveSchema: async (uri) => {
        const beginTime = TRACE_REF_RESOLUTION ? performance.now() : 0;
        let status: string = '';
        try {
          // Static/runtime types are held in the registry (DXN-form, typename-based).
          // Persisted (db-backed) types are resolved from the owning space db (echo-form URIs).
          const typeEntity = this.#resolveRegistryType(uri) ?? (await this._resolveTypeFromDatabase(uri, context));
          if (typeEntity != null) {
            status = 'resolved';
            return Type.getSchema(typeEntity);
          }
          status = 'missing';
          return undefined;
        } finally {
          if (TRACE_REF_RESOLUTION) {
            log.info('resolveSchema', {
              uri: uri.toString(),
              status,
              time: performance.now() - beginTime,
            });
          }
        }
      },

      // Parallel to resolveSchema, but returns the Type.AnyEntity entity itself
      // rather than its underlying Effect Schema. Used by `Obj.fromJSON` (queue
      // and serializer paths) so deserialized objects stamp a TypeEntityId
      // back-reference resolvable via `Obj.getType` / `Entity.getType`.
      resolveType: async (uri) => {
        return this.#resolveRegistryType(uri) ?? (await this._resolveTypeFromDatabase(uri, context));
      },
    } satisfies Ref.Resolver;
  }

  /**
   * Route a URI to its resolution backend: registry for `dxn:`, a single-space backend for a
   * space-qualified `echo:` EID, and a cross-space backend for a space-less (local) `echo:` EID.
   * Entity ids are globally unique, so a local EID is resolvable by searching every registered
   * space — this is how a relation/parent endpoint stored space-less (created before its holder
   * joined a db) resolves cross-space.
   */
  #routeBackend(uri: URI.URI): LoadBackend | undefined {
    if (DXN.isDXN(uri)) {
      return this.#registryBackend;
    }
    const eid = EID.tryParse(uri);
    if (!eid || EID.getEntityId(eid) == null) {
      return undefined;
    }
    return this.#entityBackend(EID.getSpaceId(eid));
  }

  // Registry backend — fully in-memory; effectively `working-set`.
  readonly #registryBackend: LoadBackend = {
    probe: (uri) => {
      const entity = this._registry.getByURI(uri.toString());
      return entity ? { result: entity as AnyProperties, strongDeps: [] } : undefined;
    },
    load: (_uri, _source, set) => {
      // Registry entities never load asynchronously; a probe miss is permanent.
      set('unavailable', undefined);
      return () => {};
    },
  };

  /**
   * Backend resolving an entity by id across one space (when `spaceId` is set) or every registered
   * space (when it is undefined). Cached per routing key so its identity is stable for the table.
   */
  #entityBackend(spaceId: SpaceId | undefined): LoadBackend {
    if (spaceId == null) {
      return (this.#crossSpaceBackend ??= {
        probe: (uri) => this.#probeEntity(uri, undefined),
        load: (uri, source, set) => this.#loadEntity(uri, source, set, undefined),
      });
    }
    return entry(this.#spaceBackends, spaceId).orInsert({
      probe: (uri) => this.#probeEntity(uri, spaceId),
      load: (uri, source, set) => this.#loadEntity(uri, source, set, spaceId),
    }).value;
  }

  /** Candidate spaces for a resolution: just `spaceId` when qualified, otherwise every space. */
  #candidateSpaceIds(spaceId: SpaceId | undefined): SpaceId[] {
    if (spaceId != null) {
      return [spaceId];
    }
    return [...new Set([...this._databases.keys(), ...this._queueFactories.keys()])];
  }

  /**
   * Synchronous working-set probe for an entity across candidate spaces: each local db, then its
   * known feed queues. Resolves regardless of the deleted flag — deletion is filtered by the query
   * pipeline, not by resolution (gating a deleted object's own satisfaction would hide it from
   * deleted-only queries and break re-add).
   */
  #probeEntity(uri: URI.URI, spaceId: SpaceId | undefined): LoadResult | undefined {
    const eid = EID.tryParse(uri);
    const entityId = eid ? EID.getEntityId(eid) : undefined;
    if (entityId == null) {
      return undefined;
    }

    for (const candidateSpaceId of this.#candidateSpaceIds(spaceId)) {
      const db = this._databases.get(candidateSpaceId);
      if (db) {
        const core = db.coreDatabase.getObjectCoreById(entityId, { load: false });
        if (core != null) {
          const obj = db.getObjectById(entityId, { deleted: true });
          if (obj != null) {
            return { result: obj as AnyProperties, strongDeps: core.getStrongDependencies() };
          }
        }
      }

      const queueFactory = this._queueFactories.get(candidateSpaceId);
      if (queueFactory) {
        for (const queue of queueFactory.knownQueues()) {
          const item = queue.getCachedObjectById(entityId);
          if (item != null) {
            return { result: item as AnyProperties, strongDeps: getStrongDependencies(item) };
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Load an entity's body at the given ceiling across candidate spaces: each local db document
   * (disk-bound unless `network`) and/or its feed queues. Queue items have no definitive "absent"
   * signal, so when at least one known queue could hold the item the op stays `requesting` and polls
   * for replication rather than settling `unavailable`.
   */
  #loadEntity(
    uri: URI.URI,
    source: RefSource,
    set: (state: 'pending' | 'requesting' | 'ready' | 'unavailable', result: LoadResult | undefined) => void,
    spaceId: SpaceId | undefined,
  ): () => void {
    const eid = EID.tryParse(uri);
    const entityId = eid ? EID.getEntityId(eid) : undefined;
    if (entityId == null) {
      set('unavailable', undefined);
      return () => {};
    }

    let settled = false;
    let cancelled = false;
    const cleanups: Array<() => void> = [];
    const cleanupAll = () => {
      for (const cleanup of cleanups.splice(0)) {
        cleanup();
      }
    };
    const finishReady = (result: AnyProperties, strongDeps: URI.URI[]) => {
      if (settled || cancelled) {
        return;
      }
      settled = true;
      cleanupAll();
      set('ready', { result, strongDeps });
    };

    const candidateSpaceIds = this.#candidateSpaceIds(spaceId);
    let pendingDb = 0;
    let pendingQueue = 0;
    let queuePolling = false;
    const maybeUnavailable = () => {
      if (!settled && !cancelled && pendingDb === 0 && pendingQueue === 0 && !queuePolling) {
        settled = true;
        cleanupAll();
        set('unavailable', undefined);
      }
    };

    const diskOnly = source !== 'network';
    for (const candidateSpaceId of candidateSpaceIds) {
      const db = this._databases.get(candidateSpaceId);
      if (db) {
        pendingDb++;
        void db.coreDatabase
          .loadObjectCoreById(entityId, { diskOnly, returnWithUnsatisfiedDeps: true })
          .then((core) => {
            pendingDb--;
            if (!cancelled && core != null) {
              const obj = db.getObjectById(entityId, { deleted: true });
              if (obj != null) {
                finishReady(obj as AnyProperties, core.getStrongDependencies());
                return;
              }
            }
            maybeUnavailable();
          })
          .catch(() => {
            pendingDb--;
            maybeUnavailable();
          });
      }

      const queueFactory = this._queueFactories.get(candidateSpaceId);
      if (queueFactory) {
        pendingQueue++;
        void this.#searchQueues(candidateSpaceId, entityId, queueFactory)
          .then((item) => {
            pendingQueue--;
            if (cancelled) {
              return;
            }
            if (item != null) {
              finishReady(item as AnyProperties, getStrongDependencies(item));
              return;
            }
            // Poll known queues so replicated items surface without a fresh request.
            const queues = [...queueFactory.knownQueues()];
            if (queues.length > 0) {
              queuePolling = true;
              for (const queue of queues) {
                cleanups.push(queue.beginPolling());
                cleanups.push(
                  queue.subscribe(() => {
                    const cached = queue.getCachedObjectById(entityId);
                    if (cached != null) {
                      finishReady(cached as AnyProperties, getStrongDependencies(cached));
                    }
                  }),
                );
              }
            }
            maybeUnavailable();
          })
          .catch(() => {
            pendingQueue--;
            maybeUnavailable();
          });
      }
    }

    maybeUnavailable();

    return () => {
      cancelled = true;
      cleanupAll();
    };
  }

  async #searchQueues(spaceId: SpaceId, entityId: EntityId, queueFactory: QueueFactory): Promise<Entity.Unknown | undefined> {
    for (const queue of queueFactory.knownQueues()) {
      const cached = queue.getCachedObjectById(entityId);
      if (cached != null) {
        return cached;
      }
    }
    for (const queue of queueFactory.knownQueues()) {
      const [item] = await queue.getObjectsById([entityId]);
      if (item != null) {
        return item;
      }
    }
    return this._resolveObjectInSpaceFeeds(spaceId, entityId, queueFactory);
  }

  /**
   * Resolve a type entity from the registry by URI, narrowing out any non-type entity that
   * happens to share the URI.
   */
  #resolveRegistryType(uri: URI.URI): Type.AnyEntity | undefined {
    const entity = this._registry.getByURI(uri.toString());
    return entity != null && Type.isType(entity) ? entity : undefined;
  }

  /**
   * @param db
   * @param ref
   * @param onResolve will be weakly referenced.
   */
  private _resolveSync(
    uri: URI.URI,
    context: Hypergraph.RefResolutionContext,
    onResolve?: (obj: Entity.Any) => void,
  ): Entity.Any | Queue | undefined {
    const parsedEchoUri = EID.tryParse(uri);
    if (!parsedEchoUri) {
      throw new Error('Unsupported URI kind');
    }

    const spaceId = EID.getSpaceId(parsedEchoUri) ?? context.space;
    const objectId = EID.getEntityId(parsedEchoUri);
    if (spaceId === undefined || objectId === undefined) {
      throw new Error(`Unable to determine the Space to resolve the reference: ${uri}`);
    }

    const db = this._databases.get(spaceId);
    if (db) {
      // Resolve remote reference.
      const obj = db.getObjectById(objectId);
      if (obj) {
        return obj;
      }
    }

    // Fallback: try to resolve as a queue (Feed object backed by queue service).
    // Only resolve if a queue with this id has been explicitly created — otherwise
    // QueueFactory.get would manufacture a phantom queue for every unknown ECHO ref.
    const queueEchoUri = EID.make({ spaceId: spaceId, entityId: objectId });
    const queueFactory = this._queueFactories.get(spaceId);
    const queue = queueFactory?.tryGet(queueEchoUri);
    if (queue) {
      return queue;
    }

    // TODO(dmaretskyi): Consider throwing if space not found.

    if (!OBJECT_DIAGNOSTICS.has(objectId)) {
      OBJECT_DIAGNOSTICS.set(objectId, {
        spaceId,
        objectId,
        loadReason: 'reference access',
        loadedStack: new StackTrace(),
      });
    }

    log('trap', { spaceId, objectId });
    if (onResolve) {
      entry(this._resolveEvents, spaceId)
        .orInsert(new Map())
        .deep(objectId)
        .orInsert(new Event())
        .value.on(new Context(), onResolve);
    }
  }

  private async _resolveAsync(
    uri: URI.URI,
    context: Hypergraph.RefResolutionContext,
  ): Promise<Entity.Unknown | Queue | undefined> {
    const beginTime = TRACE_REF_RESOLUTION ? performance.now() : 0;
    let status: string = '';
    try {
      const parsedEchoUri = EID.tryParse(uri);
      if (parsedEchoUri) {
        const echoUri = EID.getEntityId(parsedEchoUri);
        const echoSpaceId = EID.getSpaceId(parsedEchoUri);
        if (!echoUri) {
          status = 'error';
          throw new Error(`Invalid EID: ${uri}`);
        }
        if (!EID.isLocal(parsedEchoUri) && echoSpaceId !== context.space) {
          status = 'error';
          throw new Error('Cross-space references are not yet supported');
        }

        const feedEchoId = context.feed ? EID.tryParse(context.feed) : undefined;
        if (feedEchoId) {
          const feedSpaceId = EID.getSpaceId(feedEchoId) ?? context.space;
          const queueId = EID.getEntityId(feedEchoId);
          if (feedSpaceId && queueId) {
            const queueEchoUri = EID.make({ spaceId: feedSpaceId, entityId: queueId });
            const obj = await this._resolveQueueObjectAsync(queueEchoUri, echoUri);
            if (obj) {
              status = 'resolved';
              return obj;
            }
          }
        }

        if (!context.space) {
          status = 'error';
          throw new Error('Resolving context-free references is not supported');
        }

        // (1) Search space automerge docs first.
        const obj = await this._resolveDatabaseObjectAsync(context.space, echoUri);
        if (obj) {
          status = 'resolved';
          return obj;
        }

        // (2) Search known feeds in this space for an item with this id.
        const feedObj = await this._resolveObjectInKnownQueues(context.space, echoUri);
        if (feedObj) {
          status = 'resolved';
          return feedObj;
        }

        // (3) Fallback: caller may be addressing a queue itself by URI.
        const queueEchoUri = EID.make({ spaceId: context.space, entityId: echoUri });
        const queue = this._resolveQueueSync(queueEchoUri);
        if (queue) {
          status = 'resolved';
          return queue;
        }

        status = 'missing';
        return undefined;
      } else if (DXN.isDXN(uri)) {
        // Registry refs (DXNs) resolve to the entity held in the registry — a type entity by
        // typename DXN, or a keyed entity (operation, blueprint, etc.) by its key DXN.
        const entity = this._registry.getByURI(uri.toString());
        status = entity ? 'resolved' : 'missing';
        return entity ?? undefined;
      } else {
        status = 'error';
        throw new Error(`Unsupported URI kind: ${uri}`);
      }
    } finally {
      if (TRACE_REF_RESOLUTION) {
        log.info('resolve', {
          uri,
          status,
          time: performance.now() - beginTime,
        });
      }
    }
  }

  /**
   * Search feed-backed queues in this space for an object with the given id.
   * Queue items use ECHO URIs (`echo://spaceId/itemId`) without feed routing, so cross-db refs
   * must resolve without `context.feed`.
   */
  private async _resolveObjectInKnownQueues(spaceId: SpaceId, objectId: EntityId): Promise<Entity.Unknown | undefined> {
    const queueFactory = this._queueFactories.get(spaceId);
    if (!queueFactory) {
      return undefined;
    }

    for (const queue of queueFactory.knownQueues()) {
      const [obj] = await queue.getObjectsById([objectId]);
      if (obj) {
        return obj;
      }
    }

    return this._resolveObjectInSpaceFeeds(spaceId, objectId, queueFactory);
  }

  /**
   * Fallback: scan persisted {@link Feed.Feed} queues when the SQL index has no entry yet.
   */
  private async _resolveObjectInSpaceFeeds(
    spaceId: SpaceId,
    objectId: EntityId,
    queueFactory: QueueFactory,
  ): Promise<Entity.Unknown | undefined> {
    const db = this._databases.get(spaceId);
    if (!db) {
      return undefined;
    }

    const feeds = await db.query(Filter.type(Feed.Feed)).run();
    for (const feed of feeds) {
      const feedDXN = Feed.getQueueUri(feed);
      if (!feedDXN) {
        continue;
      }

      try {
        const queue = queueFactory.get(feedDXN);
        const [obj] = await queue.getObjectsById([objectId]);
        if (obj) {
          return obj;
        }
      } catch (error) {
        log.warn('failed to resolve object from feed queue', { spaceId, objectId, feed: feedDXN.toString(), error });
      }
    }

    return undefined;
  }

  private async _resolveDatabaseObjectAsync(spaceId: SpaceId, objectId: EntityId): Promise<Entity.Unknown | undefined> {
    const db = this._databases.get(spaceId);
    if (!db) {
      return undefined;
    }
    const [obj] = await db.query(Query.select(Filter.id(objectId)).from(db, { includeFeeds: true })).run();
    return obj;
  }

  /**
   * Resolve a persisted (db-backed) type entity from an echo-form URI.
   * Persisted schemas live in the db only (never in the shared registry), so type refs
   * carrying an echo URI (`echo:/<objectId>`) resolve through the owning space db.
   */
  private async _resolveTypeFromDatabase(
    uri: URI.URI,
    context: Hypergraph.RefResolutionContext,
  ): Promise<Type.AnyEntity | undefined> {
    const parsed = EID.tryParse(uri);
    if (!parsed) {
      return undefined;
    }
    const spaceId = EID.getSpaceId(parsed) ?? context.space;
    const objectId = EID.getEntityId(parsed);
    if (spaceId === undefined || objectId === undefined) {
      return undefined;
    }
    const obj = await this._resolveDatabaseObjectAsync(spaceId, objectId);
    return obj != null && Type.isType(obj) ? obj : undefined;
  }

  private _resolveQueueSync(queueEchoUri: EID.EID): Queue | undefined {
    const spaceId = EID.getSpaceId(queueEchoUri);
    if (!spaceId) {
      return undefined;
    }
    const queueFactory = this._queueFactories.get(spaceId);
    if (!queueFactory) {
      return undefined;
    }
    // Use `tryGet` rather than `get` so we don't manufacture a phantom queue for a URI
    // that just happens to share an ECHO object id — we only resolve to a queue when one
    // has been explicitly created (e.g. by a prior Feed.append/query for that feed).
    return queueFactory.tryGet(queueEchoUri);
  }

  private async _resolveQueueObjectAsync(
    queueEchoUri: EID.EID,
    objectId: EntityId,
  ): Promise<Entity.Unknown | undefined> {
    const spaceId = EID.getSpaceId(queueEchoUri);
    if (!spaceId) {
      return undefined;
    }
    const queueFactory = this._queueFactories.get(spaceId);
    if (!queueFactory) {
      return undefined;
    }
    const queue = queueFactory.get(queueEchoUri);
    if (!queue) {
      return undefined;
    }

    const [obj] = await queue.getObjectsById([objectId]);
    return obj;
  }

  registerQuerySourceProvider(provider: QuerySourceProvider): void {
    this._querySourceProviders.push(provider);
    for (const context of this._queryContexts.values()) {
      context.addQuerySource(provider.create());
    }
    this.#queryResultCache = new QueryResultCache();
  }

  /**
   * Does not remove the provider from active query contexts.
   */
  unregisterQuerySourceProvider(provider: QuerySourceProvider): void {
    const index = this._querySourceProviders.indexOf(provider);
    if (index !== -1) {
      this._querySourceProviders.splice(index, 1);
    }
    this.#queryResultCache = new QueryResultCache();
  }

  private _onUpdate(updateEvent: ItemsUpdatedEvent): void {
    const listenerMap = this._resolveEvents.get(updateEvent.spaceId);
    if (listenerMap) {
      batchEvents(() => {
        // TODO(dmaretskyi): We only care about created items.
        for (const item of updateEvent.itemsUpdated) {
          const listeners = listenerMap.get(item.id);
          if (!listeners) {
            continue;
          }
          const db = this._databases.get(updateEvent.spaceId);
          if (!db) {
            continue;
          }
          const obj = db.getObjectById(item.id);
          if (!obj) {
            continue;
          }
          log('resolve', { spaceId: updateEvent.spaceId, objectId: obj.id });
          listeners.emit(obj);
          listenerMap.delete(item.id);
        }
      });
    }
    this._updateEvent.emit(updateEvent);
  }

  private _createLiveObjectQueryContext(): QueryContext {
    const context = new GraphQueryContext({
      onStart: () => {
        this._queryContexts.add(context);
      },
      onStop: () => {
        this._queryContexts.delete(context);
      },
    });

    for (const database of this._databases.values()) {
      context.addQuerySource(new SpaceQuerySource(database));
    }
    context.addQuerySource(new RegistryQuerySource(this._registry));
    for (const provider of this._querySourceProviders) {
      context.addQuerySource(provider.create());
    }

    return context;
  }
}

export interface QuerySourceProvider {
  create(): QuerySource;
}

type ObjectDiagnostic = {
  objectId: string;
  spaceId: string;
  loadReason: string;
  loadedStack?: StackTrace;
  query?: string;
};

export const OBJECT_DIAGNOSTICS = new Map<string, ObjectDiagnostic>();

trace.diagnostic({
  id: 'referenced-objects',
  name: 'Referenced Objects (Client)',
  fetch: () => {
    return Array.from(OBJECT_DIAGNOSTICS.values()).map((object) => {
      return {
        objectId: object.objectId,
        spaceId: object.spaceId,
        loadReason: object.loadReason,
        creationStack: object.loadedStack?.getStack(),
        query: object.query,
      };
    });
  },
});
