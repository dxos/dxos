//
// Copyright 2022 DXOS.org
//

import { type CleanupFn, Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { StackTrace } from '@dxos/debug';
import { type Database, type Entity, Feed, Filter, type Hypergraph, Query, Ref, type Registry, Type } from '@dxos/echo';
import { type BlobBackend } from '@dxos/echo-protocol';
import {
  type AnyProperties,
  type RefResolverRequest,
  type RefSource,
  TypeSchema,
  batchEvents,
  getStrongDependencies,
  isInstanceOf,
  setRefResolver,
} from '@dxos/echo/internal';
import { DXN, EID, type EntityId, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { entry } from '@dxos/util';

import { BlobManager } from './blob';
import { type ItemsUpdatedEvent } from './core-db';
import { type LoadBackend, LoadOpTable, type LoadResult } from './core-db/load-op';
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
import { makeRegistry } from './registry';

const TRACE_REF_RESOLUTION = false;

/**
 * Manages cross-space database interactions.
 */
export class HypergraphImpl implements Hypergraph.Hypergraph {
  private readonly _databases = new Map<SpaceId, DatabaseImpl>();

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
  readonly #blobManager = new BlobManager();

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
    database._updateEvent.on(this._onUpdate.bind(this));

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

  /**
   * @internal Reached by `DatabaseImpl` to dispatch blob reads/writes.
   */
  get blobManager(): BlobManager {
    return this.#blobManager;
  }

  registerBlobBackend(name: string, backend: BlobBackend, options?: { default?: boolean }): CleanupFn {
    return this.#blobManager.registerBackend(name, backend, options);
  }

  get defaultBlobStorage(): string {
    return this.#blobManager.defaultStorage;
  }

  getDatabase(spaceId: SpaceId): DatabaseImpl | undefined {
    return this._databases.get(spaceId);
  }

  spaceIds(): readonly SpaceId[] {
    return [...this._databases.keys()];
  }

  /**
   * Database lookup honoring an optional scope allowlist. When `allowed` is set, a space outside it
   * is treated as absent (returns undefined), so resolution against a scoped view cannot reach it.
   * Unset `allowed` (the default, non-agent path) is identical to a plain `_databases.get`.
   */
  #getDb(spaceId: SpaceId, allowed?: ReadonlySet<SpaceId>): DatabaseImpl | undefined {
    if (allowed != null && !allowed.has(spaceId)) {
      return undefined;
    }
    return this._databases.get(spaceId);
  }

  /**
   * Returns a narrow-only scoped view of this hypergraph confined to `allowlist`. See
   * {@link Hypergraph.Hypergraph.scoped}.
   */
  scoped(allowlist: readonly SpaceId[]): Hypergraph.Hypergraph {
    return new ScopedHypergraph(this, new Set(allowlist));
  }

  /**
   * @param hostDb Host database for reference resolution.
   * @param middleware Called with the loaded object. The caller may change the object.
   * @returns Result of `onLoad`.
   */
  createRefResolver(
    { context = {} }: Hypergraph.RefResolverOptions,
    /**
     * Optional scope allowlist. When set (by {@link ScopedHypergraph}), synchronous resolution of a
     * space-qualified URI outside the set misses, so a scoped view cannot reach a foreign space.
     */
    allowed?: ReadonlySet<SpaceId>,
  ): Ref.Resolver {
    // TODO(dmaretskyi): Rewrite resolution algorithm with tracks for absolute and relative DXNs.

    // A resolved reference that points at a persisted (db-backed) schema object surfaces as the
    // registered `Type.Type` entity rather than the raw stored object, so consumers see a stable
    // type entity. Other entities pass through unchanged.
    const materializeStoredSchema = (obj: AnyProperties): AnyProperties => {
      if (context.space != null && isInstanceOf(TypeSchema, obj) && Type.getDatabase(obj) != null) {
        return this.getDatabase(context.space)?._getOrRegisterPersistentSchema(obj) ?? obj;
      }
      return obj;
    };

    return {
      resolve: (uri: URI.URI, { source }: { source: RefSource }): RefResolverRequest => {
        const root = this.#loadOpTable.acquire(this.#qualifyToContext(uri, context), source);
        return new RequestImpl(this.#loadOpTable, root, source);
      },

      // TODO(dmaretskyi): Respect `load` flag.
      resolveSync: (uri: URI.URI, load: boolean, onLoad?: () => void) => {
        if (EID.isEID(uri)) {
          const res = this._resolveSync(uri, context, allowed, onLoad);
          return res ? materializeStoredSchema(res) : undefined;
        }

        // Registry refs (DXNs) resolve to the entity held in the registry — a type entity by
        // typename DXN, or a keyed entity (operation, skill, etc.) by its key DXN.
        if (DXN.isDXN(uri)) {
          const entity = this._registry.getByURI(uri.toString());
          return entity ? materializeStoredSchema(entity) : undefined;
        }

        return undefined; // Unsupported URI kind.
      },

      resolveLegacy: async (uri) => {
        const obj = await this._resolveAsync(uri, context);
        return obj ? materializeStoredSchema(obj) : undefined;
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
   * Qualifies a space-less (relative) `echo:` URI with the resolving context's space. Same-space
   * references are persisted relative; cross-space references are persisted absolute (stamped at
   * write time). Routing is by fully-qualified URI, so a relative URI is resolved against the
   * context that requested it. Non-`echo:` and already-qualified URIs pass through unchanged.
   */
  #qualifyToContext(uri: URI.URI, context: Hypergraph.RefResolutionContext): URI.URI {
    const eid = EID.tryParse(uri);
    if (eid == null || !EID.isLocal(eid) || context.space == null) {
      return uri;
    }
    const entityId = EID.getEntityId(eid);
    return entityId != null ? EID.make({ spaceId: context.space, entityId }) : uri;
  }

  /**
   * Route a URI to its resolution backend: registry for `dxn:` and a single-space backend for a
   * space-qualified `echo:` EID. A space-less EID is unroutable here — callers qualify relative URIs
   * to a space (via {@link #qualifyToContext} for request roots, or the owning space for discovered
   * strong-dependency edges) before routing.
   */
  #routeBackend(uri: URI.URI): LoadBackend | undefined {
    if (DXN.isDXN(uri)) {
      return this.#registryBackend;
    }
    const eid = EID.tryParse(uri);
    if (!eid || EID.getEntityId(eid) == null) {
      return undefined;
    }
    const spaceId = EID.getSpaceId(eid);
    if (spaceId == null) {
      return undefined;
    }
    return this.#entityBackend(spaceId);
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
   * Backend resolving an entity by id within a single space. Cached per space so its identity is
   * stable for the table.
   */
  #entityBackend(spaceId: SpaceId): LoadBackend {
    return entry(this.#spaceBackends, spaceId).orInsert({
      probe: (uri) => this.#probeEntity(uri, spaceId),
      load: (uri, source, set) => this.#loadEntity(uri, source, set, spaceId),
    }).value;
  }

  /**
   * Synchronous working-set probe for an entity within its space: the local db, then its known feed
   * queues. Resolves regardless of the deleted flag — deletion is filtered by the query pipeline,
   * not by resolution (gating a deleted object's own satisfaction would hide it from deleted-only
   * queries and break re-add).
   */
  #probeEntity(uri: URI.URI, spaceId: SpaceId): LoadResult | undefined {
    const eid = EID.tryParse(uri);
    const entityId = eid ? EID.getEntityId(eid) : undefined;
    if (entityId == null) {
      return undefined;
    }

    for (const candidateSpaceId of [spaceId]) {
      const db = this._databases.get(candidateSpaceId);
      if (db) {
        const core = db.getObjectCoreById(entityId, { load: false });
        if (core != null) {
          const obj = db.getObjectById(entityId, { deleted: true });
          if (obj != null) {
            return { result: obj as AnyProperties, strongDeps: core.getStrongDependencies() };
          }
        }
      }

      if (db) {
        for (const handle of db._knownFeedHandles()) {
          const item = handle.getCachedObjectById(entityId);
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
    spaceId: SpaceId,
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

    const candidateSpaceIds = [spaceId];
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
        void db
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

      if (db) {
        const handles = [...db._knownFeedHandles()];
        if (handles.length > 0) {
          pendingQueue++;
          void this.#searchFeedHandles(candidateSpaceId, entityId, handles)
            .then((item) => {
              pendingQueue--;
              if (cancelled) {
                return;
              }
              if (item != null) {
                finishReady(item as AnyProperties, getStrongDependencies(item));
                return;
              }
              // Poll known feed handles so replicated items surface without a fresh request.
              if (handles.length > 0) {
                queuePolling = true;
                for (const handle of handles) {
                  cleanups.push(handle.beginPolling());
                  cleanups.push(
                    handle.updated.on(() => {
                      const cached = handle.getCachedObjectById(entityId);
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
    }

    maybeUnavailable();

    return () => {
      cancelled = true;
      cleanupAll();
    };
  }

  async #searchFeedHandles(
    spaceId: SpaceId,
    entityId: EntityId,
    handles: ReturnType<DatabaseImpl['_knownFeedHandles']>,
  ): Promise<Entity.Unknown | undefined> {
    for (const handle of handles) {
      const cached = handle.getCachedObjectById(entityId);
      if (cached != null) {
        return cached;
      }
    }
    for (const handle of handles) {
      const [item] = await handle.getObjectsById([entityId]);
      if (item != null) {
        return item;
      }
    }
    return this._resolveObjectInSpaceFeeds(spaceId, entityId);
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
    allowed?: ReadonlySet<SpaceId>,
    onResolve?: (obj: Entity.Any) => void,
  ): Entity.Any | undefined {
    const parsedEchoUri = EID.tryParse(uri);
    if (!parsedEchoUri) {
      throw new Error('Unsupported URI kind');
    }

    const spaceId = EID.getSpaceId(parsedEchoUri) ?? context.space;
    const objectId = EID.getEntityId(parsedEchoUri);
    if (spaceId === undefined || objectId === undefined) {
      throw new Error(`Unable to determine the Space to resolve the reference: ${uri}`);
    }

    const db = this.#getDb(spaceId, allowed);
    if (db) {
      // Resolve remote reference. Feeds are regular ECHO objects, so a feed URI resolves here.
      const obj = db.getObjectById(objectId);
      if (obj) {
        return obj;
      }
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
  ): Promise<Entity.Unknown | undefined> {
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
            const feedEchoUri = EID.make({ spaceId: feedSpaceId, entityId: queueId });
            const obj = await this._resolveFeedObjectAsync(feedEchoUri, echoUri);
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
        const feedObj = await this._resolveObjectInKnownFeeds(context.space, echoUri);
        if (feedObj) {
          status = 'resolved';
          return feedObj;
        }

        status = 'missing';
        return undefined;
      } else if (DXN.isDXN(uri)) {
        // Registry refs (DXNs) resolve to the entity held in the registry — a type entity by
        // typename DXN, or a keyed entity (operation, skill, etc.) by its key DXN.
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
   * Search feed-backed handles in this space for an object with the given id.
   * Feed items use ECHO URIs (`echo://spaceId/itemId`) without feed routing, so cross-db refs
   * must resolve without `context.feed`.
   */
  private async _resolveObjectInKnownFeeds(spaceId: SpaceId, objectId: EntityId): Promise<Entity.Unknown | undefined> {
    const db = this._databases.get(spaceId);
    if (!db) {
      return undefined;
    }

    for (const feed of db._knownFeedHandles()) {
      const [obj] = await feed.getObjectsById([objectId]);
      if (obj) {
        return obj;
      }
    }

    return this._resolveObjectInSpaceFeeds(spaceId, objectId);
  }

  /**
   * Fallback: scan persisted {@link Feed.Feed} objects when the SQL index has no entry yet.
   */
  private async _resolveObjectInSpaceFeeds(spaceId: SpaceId, objectId: EntityId): Promise<Entity.Unknown | undefined> {
    const db = this._databases.get(spaceId);
    if (!db) {
      return undefined;
    }

    const feeds = await db.query(Filter.type(Feed.Feed)).run();
    for (const feed of feeds) {
      const feedDXN = Feed.getFeedUri(feed);
      if (!feedDXN) {
        continue;
      }

      try {
        const handle = db._getOrCreateFeedHandle(feedDXN, feed.namespace);
        const [obj] = await handle.getObjectsById([objectId]);
        if (obj) {
          return obj;
        }
      } catch (error) {
        log.warn('failed to resolve object from feed', { spaceId, objectId, feed: feedDXN.toString(), error });
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

  private async _resolveFeedObjectAsync(feedEchoUri: EID.EID, objectId: EntityId): Promise<Entity.Unknown | undefined> {
    const spaceId = EID.getSpaceId(feedEchoUri);
    if (!spaceId) {
      return undefined;
    }
    const db = this._databases.get(spaceId);
    if (!db) {
      return undefined;
    }
    const feedObjectId = EID.getEntityId(feedEchoUri);
    const feed = feedObjectId ? db.getObjectById<Feed.Feed>(feedObjectId) : undefined;
    const handle = db._getOrCreateFeedHandle(feedEchoUri, feed?.namespace);
    const [obj] = await handle.getObjectsById([objectId]);
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
    // Heal resolution requests that latched `requesting`/`unavailable` before the object was
    // materialized locally: re-probe the working set for any cached load op now that the object is
    // present, so its dependents (e.g. index-query hydration gated on the strong-dep closure)
    // recompute to `ready` instead of polling/timing out.
    for (const item of updateEvent.itemsUpdated) {
      this.#loadOpTable.refreshFromWorkingSet(EID.make({ spaceId: updateEvent.spaceId, entityId: item.id }));
    }

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

  /**
   * @internal Exposed for {@link ScopedHypergraph}.
   * @param allowed When set, fan-out is confined to these spaces: only their {@link SpaceQuerySource}s
   *   are added, the context is NOT tracked in `_queryContexts` (so a later `_registerDatabase` cannot
   *   push a foreign source into it), and each custom provider (e.g. the remote index) is created with
   *   the allowlist so it confines its own search and results to those spaces.
   */
  _createLiveObjectQueryContext(allowed?: ReadonlySet<SpaceId>): QueryContext {
    const scoped = allowed != null;
    const context = new GraphQueryContext(
      scoped
        ? { onStart: () => {}, onStop: () => {} }
        : {
            onStart: () => {
              this._queryContexts.add(context);
            },
            onStop: () => {
              this._queryContexts.delete(context);
            },
          },
    );

    for (const database of this._databases.values()) {
      if (allowed != null && !allowed.has(database.spaceId)) {
        continue;
      }
      context.addQuerySource(new SpaceQuerySource(database));
    }
    // Registry holds code-shipped/keyed entities (types, operations, skills) — not space-scoped.
    context.addQuerySource(new RegistryQuerySource(this._registry));
    for (const provider of this._querySourceProviders) {
      if (allowed == null) {
        context.addQuerySource(provider.create());
      } else {
        // One confined source per allowed space: the index host does single-space full-text only
        // (see query-executor `spaces.length <= 1`), so a multi-space view fans out per space and the
        // context merges the results. Each source confines its own search and results to its space.
        for (const spaceId of allowed) {
          context.addQuerySource(provider.create(new Set([spaceId])));
        }
      }
    }

    return context;
  }
}

/**
 * A narrow-only view of a {@link HypergraphImpl} confined to a fixed set of spaces: queries fan out
 * only to those spaces, `getDatabase` returns undefined outside the set, and synchronous resolution
 * cannot reach a foreign space. The confinement is structural — the foreign spaces are simply absent
 * from the view, so there is nothing to "deny" — and `scoped` can only further narrow the set.
 *
 * Shares the root's databases, registry and resolution machinery (it is a view, not a copy); only
 * the reachable space set differs. Used to confine an AI agent's `Database.Service` to an allowlist.
 * See `docs/design/agent-firewall.md`.
 */
export class ScopedHypergraph implements Hypergraph.Hypergraph {
  readonly #root: HypergraphImpl;
  readonly #allowed: ReadonlySet<SpaceId>;

  constructor(root: HypergraphImpl, allowed: ReadonlySet<SpaceId>) {
    this.#root = root;
    this.#allowed = allowed;
  }

  get registry(): Registry.Registry {
    return this.#root.registry;
  }

  declare query: Database.QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(queryOrFilter: Query.Any | Filter.Any) {
    const query = Filter.is(queryOrFilter) ? Query.select(queryOrFilter) : queryOrFilter;
    // Fresh result (not the root's shared query cache) over the scope-filtered source set, so a
    // confined query can never read — nor be served a cached result from — a space outside the set.
    return new QueryResultImpl(this.#root._createLiveObjectQueryContext(this.#allowed), query);
  }

  makeRef<T extends AnyProperties = any>(uri: URI.URI): Ref.Ref<T> {
    const ref = Ref.fromURI(uri);
    setRefResolver(ref, this.createRefResolver({}));
    return ref;
  }

  createRefResolver(options: Hypergraph.RefResolverOptions): Ref.Resolver {
    return this.#root.createRefResolver(options, this.#allowed);
  }

  getDatabase(spaceId: SpaceId): DatabaseImpl | undefined {
    return this.#allowed.has(spaceId) ? this.#root.getDatabase(spaceId) : undefined;
  }

  spaceIds(): readonly SpaceId[] {
    // Only the spaces the root actually holds AND this view is allowed to reach — never the full
    // allowlist (which may name spaces not present) and never beyond it.
    return this.#root.spaceIds().filter((spaceId) => this.#allowed.has(spaceId));
  }

  scoped(allowlist: readonly SpaceId[]): Hypergraph.Hypergraph {
    // Narrow-only: intersect with the current set; the result can never reach a space this view
    // could not already reach.
    const next = new Set<SpaceId>();
    for (const spaceId of allowlist) {
      if (this.#allowed.has(spaceId)) {
        next.add(spaceId);
      }
    }
    return new ScopedHypergraph(this.#root, next);
  }

  // Blob storage is graph-global (not space-scoped), so a scoped view shares the root's backends.
  registerBlobBackend(name: string, backend: BlobBackend, options?: { default?: boolean }): CleanupFn {
    return this.#root.registerBlobBackend(name, backend, options);
  }

  get defaultBlobStorage(): string {
    return this.#root.defaultBlobStorage;
  }
}

export interface QuerySourceProvider {
  /**
   * @param allowed When set, the source must confine its results to these spaces (a scoped view).
   *   Unset ⇒ unconfined (all spaces), the default non-agent behavior.
   */
  create(allowed?: ReadonlySet<SpaceId>): QuerySource;
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
