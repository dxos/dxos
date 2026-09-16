//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Predicate from 'effect/Predicate';

import { DeferredTask, Event, UpdateScheduler } from '@dxos/async';
import { Context } from '@dxos/context';
import { Entity, type Feed, Obj, type Ref } from '@dxos/echo';
import {
  ObjectDatabaseId,
  type ObjectJSON,
  ParentId,
  SelfURIId,
  assertObjectModel,
  isProxy,
  makeDecodedEntityLive,
  objectFromJSON,
  setRefResolverOnData,
} from '@dxos/echo/internal';
import { defineHiddenProperty } from '@dxos/echo/internal';
import { failedInvariant, invariant } from '@dxos/invariant';
import { EID, EntityId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError, runServiceCall, subscribeStream } from '@dxos/protocols';
import { type FeedService } from '@dxos/protocols/rpc';

import { type DatabaseImpl } from '../proxy-db/index.ts';
import { FeedCoreRegistry } from './feed-core-registry.ts';
import { FeedObjectCore } from './feed-object-core.ts';

const TRACE_FEED_LOAD = false;

// Appending large amount of objects at once is not supported by the server.
// https://linear.app/dxos/issue/DX-449/queueappend-fails-when-there-are-too-many-objects-due-to-there-being
const FEED_APPEND_BATCH_SIZE = 15;

const RECONNECT_INITIAL_DELAY = 1_000;

/**
 * Ceiling for {@link FeedHandle.beginPolling}'s reconnect backoff after a stream error: the delay
 * doubles after each failed attempt, capped here, and resets to {@link RECONNECT_INITIAL_DELAY} the
 * moment a reconnected stream observes data.
 */
const RECONNECT_MAX_DELAY = 30_000;

/**
 * Client-side handle for a single feed, backed by an EDGE queue.
 * Internal to echo-client — feed operations are exposed through {@link DatabaseImpl}.
 */
export class FeedHandle {
  private readonly _ctx = new Context();

  public readonly updated = new Event();

  private readonly _refreshTask = new DeferredTask(this._ctx, async () => {
    const thisRefreshId = ++this._refreshId;
    try {
      TRACE_FEED_LOAD &&
        log.info('feed refresh begin', { currentObjects: this._objects.length, refreshId: thisRefreshId });
      const result = await runServiceCall(
        this._runtime,
        this._service['FeedService.queryFeed']({
          query: {
            feedNamespace: this._namespace,
            spaceId: this._spaceId,
            feedIds: [this._feedId],
          },
        }),
      );
      await this.#applyQueryResult(thisRefreshId, result);
    } catch (err) {
      // TODO(dmaretskyi): This task occasionally fails with "The database connection is not open" error in tests -- some issue with teardown ordering.
      //                   We should find the root cause and fix it instead of muting the error.
      if (!isSqliteNotOpenError(err)) {
        log.catch(err);
      }
      this._error = err as Error;
      this._isLoading = false;
      this.updated.emit();
    }
  });

  /**
   * Applies a `queryFeed`/`subscribeFeed` snapshot to the working set, shared by the manual
   * one-shot {@link _refreshTask} and {@link beginPolling}'s streaming subscription. `refreshId`
   * guards against a superseded response (an overlapping manual {@link refresh} or a later stream
   * push) clobbering fresher state that already landed.
   */
  async #applyQueryResult(refreshId: number, result: FeedService.FeedQueryResult): Promise<void> {
    const { objects } = result;
    TRACE_FEED_LOAD && log.info('items fetched', { refreshId, count: objects?.length ?? 0 });
    if (refreshId !== this._refreshId || this._ctx.disposed) {
      return;
    }

    const parsedObjects = (objects ?? []).flatMap((encoded) => {
      try {
        const obj = JSON.parse(encoded) as ObjectJSON;
        if (!EntityId.isValid(obj.id)) {
          log.verbose('feed object missing valid id; ignored', { obj });
          return [];
        }
        return [obj];
      } catch (err) {
        log.verbose('feed object JSON parse failed; object ignored', { encoded, error: err });
        return [];
      }
    });

    // Routes through the same core-tracking materialization as query hydration, so a refreshed
    // re-read never clobbers a not-yet-echoed local `Obj.update` and preserves entity identity.
    const decodedObjects = await Promise.all(parsedObjects.map((obj) => this.upsertFromJSON(obj))).then((objects) =>
      objects.filter(Predicate.isNotUndefined),
    );

    if (refreshId !== this._refreshId) {
      return;
    }

    const changed = objectSetChanged(this._objects, decodedObjects);
    TRACE_FEED_LOAD && log.info('feed refresh', { changed, objects: objects?.length ?? 0, refreshId });
    this._objects = decodedObjects;
    this.#objectIds = new Set(decodedObjects.map((obj) => obj.id));
    this._isLoading = false;
    if (changed) {
      this.updated.emit();
    }
  }

  /**
   * Debounces `Obj.update` mutations on live feed objects into a single background append per
   * flush cycle (coalescing), mirroring `RepoProxy._sendUpdatesJob`'s use of the same primitive.
   */
  readonly #appendScheduler = new UpdateScheduler(this._ctx, () => this.#flushDirty());

  private readonly _spaceId: SpaceId;
  private readonly _feedId: string;

  /**
   * Number of active polling handlers.
   */
  private _pollingHandlers: number = 0;

  private _parentEntity: Obj.Unknown | undefined = undefined;

  /**
   * Per-object client-side state, keyed by id — the single source of truth for entity identity.
   * Held weakly: identity only needs preserving while a caller holds the object, so reading a feed
   * does not make it resident for the life of the handle. See {@link FeedCoreRegistry}.
   */
  readonly #cores = new FeedCoreRegistry();
  /** Cores with a local `Obj.update` not yet captured for append. */
  readonly #dirtyCores = new Set<FeedObjectCore>();
  /** In-flight append RPCs, awaited by {@link waitForPendingWrites}. */
  readonly #inFlight = new Set<Promise<void>>();
  /** Dedupes concurrent hydrations of the same id (reactive query + one-shot query racing). */
  readonly #hydrating = new Map<EntityId, Promise<Entity.Unknown | undefined>>();

  private _objects: Entity.Unknown[] = [];
  /** Mirrors `_objects`'s ids, kept incremental so append/delete avoid rescanning the whole working set. */
  #objectIds = new Set<string>();
  private _isLoading = true;
  private _error: Error | null = null;
  private _refreshId = 0;
  private _loadObjectsPromise: Promise<Entity.Unknown[]> | undefined;

  /** Cleanup for the active `FeedService.subscribeFeed` stream, set only while polling handlers > 0. */
  #feedSubscriptionCleanup: (() => void) | null = null;
  /** Pending reconnect after a stream error; cancelled on unsubscribe/dispose. */
  #reconnectTimer: NodeJS.Timeout | null = null;
  /** Current reconnect delay; grows on repeated failures, resets once a reconnected stream observes data. */
  #reconnectDelay = RECONNECT_INITIAL_DELAY;
  /**
   * Bumped on every unsubscribe-to-zero and every fresh {@link beginPolling}, invalidating any
   * reconnect scheduled by a superseded subscription so it can't fire alongside a newer one.
   */
  #subscriptionGeneration = 0;

  constructor(
    private readonly _service: FeedService.Client,
    private readonly _runtime: EffectContext.Context<never>,
    private readonly _refResolver: Ref.Resolver,
    private readonly _echoUri: EID.EID,
    private readonly _database: DatabaseImpl,
    private readonly _namespace: string = 'data',
  ) {
    this._spaceId = EID.getSpaceId(_echoUri) ?? failedInvariant('Missing spaceId in EID');
    this._feedId = EID.getEntityId(_echoUri) ?? failedInvariant('Missing feedId in EID');
  }

  get uri(): EID.EID {
    return this._echoUri;
  }

  get namespace(): string {
    return this._namespace;
  }

  get refResolver(): Ref.Resolver {
    return this._refResolver;
  }

  /**
   * Set the parent entity for items in this feed.
   * When set, all deserialized items will have their parent set to this entity.
   */
  setParentEntity(parent: Obj.Unknown): void {
    this._parentEntity = parent;
  }

  toJSON() {
    return {
      uri: this._echoUri,
      objects: this._objects.length,
    };
  }

  /**
   * Objects resident in this handle's core cache. A superset of the queried working set: a core is
   * registered for every object the handle has hydrated, and is dropped only on `delete` or
   * `dispose`, so this is the retention-relevant count rather than `_objects.length`.
   */
  get residentObjectCount(): number {
    return this.#cores.size;
  }

  /**
   * Insert into feed with optimistic update, awaiting the append RPC. Re-appending an id that
   * already has a core is an update (see `EntityMetaIndex`'s upsert-by-id): the argument's state is
   * applied onto the existing working-set instance, which stays canonical, rather than registering a
   * second core.
   */
  async append(items: Entity.Unknown[]): Promise<void> {
    const cores = this.#registerItemsForAppend(items);

    const batch = cores.map((core) => {
      // Captured explicitly below — don't let the background scheduler also flush this core.
      this.#dirtyCores.delete(core);
      const { json, token } = core.captureForAppend();
      return { core, json, token };
    });

    this.#addOptimistic(cores);

    const encoded = batch.map(({ json }) => JSON.stringify(json));
    const sendPromise = this.#sendAppendBatches(encoded).catch((err) => {
      log.catch(err);
      this._error = err as Error;
      this.updated.emit();
      for (const { core, token } of batch) {
        core.revertCapture(token);
        this.#dirtyCores.add(core);
      }
      this.#appendScheduler.trigger();
    });
    this.#inFlight.add(sendPromise);
    try {
      await sendPromise;
    } finally {
      this.#inFlight.delete(sendPromise);
    }
  }

  /**
   * Synchronous alternative to {@link append}: registers each item as a live feed object and
   * schedules the append in the background (no RPC awaited). Persistence is confirmed by
   * {@link waitForPendingWrites} (which `db.flush()` awaits). Backs `db.add(obj, { to: feed })`.
   */
  appendSync(items: Entity.Unknown[]): void {
    const cores = this.#registerItemsForAppend(items);
    for (const core of cores) {
      this.#onCoreDirty(core);
    }
    this.#addOptimistic(cores);
  }

  /**
   * Shared preamble for {@link append}/{@link appendSync}: validate inputs, stamp feed metadata, and
   * register (or update in place, for a re-append-by-id) the working-set core for each item.
   */
  #registerItemsForAppend(items: Entity.Unknown[]): FeedObjectCore[] {
    for (const item of items) {
      if (!isProxy(item) && !Entity.isEntity(item)) {
        throw new TypeError(
          'feed.append expects reactive ECHO objects. Plain objects must be created using Obj.make(Type, props).',
        );
      }
    }
    items.forEach((item) => assertObjectModel(item));

    return items.map((item) => {
      setRefResolverOnData(item, this._refResolver);
      defineHiddenProperty(item, SelfURIId, EID.make({ spaceId: this._spaceId, entityId: item.id }));
      defineHiddenProperty(item, ObjectDatabaseId, this._database);
      if (this._parentEntity) {
        defineHiddenProperty(item, ParentId, this._parentEntity);
      }

      const id = EntityId.make(item.id);
      const existingCore = this.#cores.get(id);
      const core = existingCore ?? this.#registerCore(item);
      if (existingCore && existingCore.entity !== item) {
        existingCore.applyLocalUpdate(item);
      }
      return core;
    });
  }

  /** Append newly-tracked core entities to the ordered working-set view and notify subscribers. */
  #addOptimistic(cores: FeedObjectCore[]): void {
    const newEntities: Entity.Unknown[] = [];
    for (const core of cores) {
      const entity = core.entity;
      if (!this.#objectIds.has(entity.id)) {
        this.#objectIds.add(entity.id);
        newEntities.push(entity);
      }
    }
    if (newEntities.length === 0) {
      return;
    }
    this._objects = [...this._objects, ...newEntities];
    this.updated.emit();
  }

  /** Enqueue a core for the next background append and wake the scheduler. */
  #onCoreDirty(core: FeedObjectCore): void {
    this.#dirtyCores.add(core);
    this.#appendScheduler.trigger();
  }

  async delete(ids: string[]): Promise<void> {
    // Optimistic update.
    for (const id of ids) {
      if (!EntityId.isValid(id)) {
        continue;
      }
      const core = this.#cores.get(id);
      if (core) {
        core.markDeleted();
        this.#cores.delete(id);
        this.#dirtyCores.delete(core);
      }
      this.#objectIds.delete(id);
    }
    this._objects = this._objects.filter((item) => !ids.includes(item.id));
    this.updated.emit();

    try {
      await runServiceCall(
        this._runtime,
        this._service['FeedService.deleteFromFeed']({
          subspaceTag: this._namespace,
          spaceId: this._spaceId,
          feedId: this._feedId,
          objectIds: ids,
        }),
      );
    } catch (err) {
      this._error = err as Error;
      this.updated.emit();
    }
  }

  /**
   * Send captured append batches to the feed service, chunked to `FEED_APPEND_BATCH_SIZE` (the
   * server rejects overly large single inserts).
   */
  async #sendAppendBatches(encoded: string[]): Promise<void> {
    for (let i = 0; i < encoded.length; i += FEED_APPEND_BATCH_SIZE) {
      await runServiceCall(
        this._runtime,
        this._service['FeedService.insertIntoFeed']({
          subspaceTag: this._namespace,
          spaceId: this._spaceId,
          feedId: this._feedId,
          objects: encoded.slice(i, i + FEED_APPEND_BATCH_SIZE),
        }),
      );
    }
  }

  /**
   * Flush every dirty core's pending `Obj.update`(s) as a single feed append per core (coalescing).
   * Scheduled via `#appendScheduler`; also runs synchronously (via `runBlocking`) from
   * {@link waitForPendingWrites}.
   */
  async #flushDirty(): Promise<void> {
    if (this.#dirtyCores.size === 0) {
      return;
    }
    const batch = [...this.#dirtyCores].map((core) => {
      const { json, token } = core.captureForAppend();
      return { core, json, token };
    });
    this.#dirtyCores.clear();

    const encoded = batch.map(({ json }) => JSON.stringify(json));
    const sendPromise = this.#sendAppendBatches(encoded).catch((err) => {
      log.catch(err);
      this._error = err as Error;
      this.updated.emit();
      for (const { core, token } of batch) {
        core.revertCapture(token);
        this.#dirtyCores.add(core);
      }
      this.#appendScheduler.trigger();
    });
    this.#inFlight.add(sendPromise);
    try {
      await sendPromise;
    } finally {
      this.#inFlight.delete(sendPromise);
    }
  }

  /**
   * Wait for every pending local `Obj.update` to be captured and sent (not for it to be echoed back
   * through polling — the index that serves queries is caught up synchronously by the query host
   * itself, so callers don't need to wait on our own poll cycle). Mirrors `RepoProxy.flush`.
   *
   * Best-effort, matching the pre-existing append contract: a failed send re-queues its cores and
   * reschedules, so this can return with a retry still pending, and the failure surfaces only via
   * {@link error} rather than rejecting.
   *
   * TODO(wittjosiah): Drain until `#dirtyCores` and `#inFlight` both settle and propagate a
   *   persistent failure, so `db.flush()` cannot report success over unwritten state. Needs a
   *   bounded retry policy first — an unbounded drain would hang on a permanently failing send.
   */
  async waitForPendingWrites(): Promise<void> {
    if (this.#dirtyCores.size > 0) {
      await this.#appendScheduler.runBlocking();
    }
    await Promise.allSettled([...this.#inFlight]);
  }

  async sync({
    shouldPush = true,
    shouldPull = true,
  }: { shouldPush?: boolean; shouldPull?: boolean } = {}): Promise<void> {
    await runServiceCall(
      this._runtime,
      this._service['FeedService.syncFeed']({
        subspaceTag: this._namespace,
        spaceId: this._spaceId,
        feedId: this._feedId,
        shouldPush,
        shouldPull,
      }),
    );
  }

  async refresh(): Promise<void> {
    await this._refreshTask.runBlocking();
  }

  async getSyncState(): Promise<Feed.SyncState> {
    const response = await runServiceCall(
      this._runtime,
      this._service['FeedService.getSyncState']({
        spaceId: this._spaceId,
        namespaces: [this._namespace],
      }),
    );
    const entry = response.namespaces?.find((state) => state.namespace === this._namespace);
    return {
      blocksToPull: Number(entry?.blocksToPull ?? 0),
      blocksToPush: Number(entry?.blocksToPush ?? 0),
      totalBlocks: Number(entry?.totalBlocks ?? 0),
    };
  }

  async fetchObjectsJSON(): Promise<ObjectJSON[]> {
    const { objects } = await runServiceCall(
      this._runtime,
      this._service['FeedService.queryFeed']({
        query: {
          feedNamespace: this._namespace,
          spaceId: this._spaceId,
          feedIds: [this._feedId],
        },
      }),
    );
    return (objects ?? []).flatMap((encoded) => {
      try {
        return [JSON.parse(encoded) as ObjectJSON];
      } catch (err) {
        log.verbose('feed object JSON parse failed; object ignored', { encoded, error: err });
        return [];
      }
    });
  }

  /**
   * The single materialization entry point for feed JSON: reconciles into an existing core's
   * working-set instance, or decodes and registers a fresh live core. Used by polling, reference
   * resolution, and (via `DatabaseImpl._getFeedHandleIfAvailable`) index-backed query hydration —
   * whichever of these observes an id first wins the identity for that entity.
   */
  async upsertFromJSON(json: ObjectJSON): Promise<Entity.Unknown | undefined> {
    if (!EntityId.isValid(json.id)) {
      log.verbose('feed object missing valid id; ignored', { json });
      return undefined;
    }
    const id = json.id;

    const existingCore = this.#cores.get(id);
    if (existingCore) {
      try {
        const decoded = await Obj.fromJSON(json, {
          refResolver: this._refResolver,
          uri: EID.make({ spaceId: this._spaceId, entityId: id }),
          database: this._database,
          parent: this._parentEntity,
        });
        existingCore.reconcile(decoded, json);
      } catch (err) {
        log.verbose('schema validation error; object ignored', { json, error: err });
      }
      return existingCore.entity;
    }

    let hydrating = this.#hydrating.get(id);
    if (!hydrating) {
      hydrating = this.#hydrateNew(json, id);
      this.#hydrating.set(id, hydrating);
      void hydrating.finally(() => this.#hydrating.delete(id));
    }
    return hydrating;
  }

  async #hydrateNew(json: ObjectJSON, id: EntityId): Promise<Entity.Unknown | undefined> {
    try {
      const snapshot = await objectFromJSON(json, {
        refResolver: this._refResolver,
        uri: EID.make({ spaceId: this._spaceId, entityId: id }),
        database: this._database,
        parent: this._parentEntity,
      });
      // Rewrap the decoded snapshot as a live reactive proxy so `Obj.update` mutates and notifies.
      const decoded = makeDecodedEntityLive(snapshot);
      invariant(Entity.isEntity(decoded), 'objectFromJSON produced an invalid entity');
      // A concurrent writer (e.g. `append`) may have registered a core for this id while we were
      // decoding — discard this (possibly stale) hydration rather than clobber the fresher core;
      // the next poll or query reconciles it properly via the "existing core" branch above.
      const racedCore = this.#cores.get(id);
      if (racedCore) {
        return racedCore.entity;
      }
      this.#registerCore(decoded);
      return decoded;
    } catch (err) {
      log.verbose('schema validation error; object ignored', { json, error: err });
      return undefined;
    }
  }

  #registerCore(entity: Entity.Unknown): FeedObjectCore {
    const core = new FeedObjectCore(entity, (dirtyCore) => this.#onCoreDirty(dirtyCore));
    this.#cores.set(EntityId.make(entity.id), core);
    return core;
  }

  /**
   * Internal use.
   * Doesn't trigger update events.
   */
  getObjectsSync(): Entity.Unknown[] {
    return this._objects;
  }

  getCachedObjectById<T extends Entity.Unknown = Entity.Unknown>(id: EntityId): T | undefined {
    // Feed entries may be objects or relations; callers narrow via the generic, mirroring
    // DatabaseImpl.getObjectById.
    return this.#cores.get(id)?.entity as T | undefined;
  }

  /**
   * Resolves feed items by id. Used by reference resolution.
   */
  async getObjectsById(ids: EntityId[]): Promise<(Entity.Unknown | undefined)[]> {
    // Resolve what is already live and hold it here for the rest of the call: the core registry is
    // weak, so an id resolvable at entry could otherwise be collected across the await below and
    // read back as `undefined` — a miss for an object the feed does have.
    const resolved = new Map<EntityId, Entity.Unknown>();
    for (const id of ids) {
      const entity = this.#cores.get(id)?.entity;
      if (entity !== undefined) {
        resolved.set(id, entity);
      }
    }

    if (ids.some((id) => !resolved.has(id))) {
      this._loadObjectsPromise ??= this._loadObjects().finally(() => {
        this._loadObjectsPromise = undefined;
      });
      for (const entity of await this._loadObjectsPromise) {
        if (EntityId.isValid(entity.id)) {
          resolved.set(EntityId.make(entity.id), entity);
        }
      }
    }

    return ids.map((id) => resolved.get(id));
  }

  private async _loadObjects(): Promise<Entity.Unknown[]> {
    const objects = await this.fetchObjectsJSON();
    const decodedObjects = await Promise.all(
      objects.filter((obj) => EntityId.isValid(obj.id)).map((obj) => this.upsertFromJSON(obj)),
    ).then((objects) => objects.filter(Predicate.isNotUndefined));

    return decodedObjects;
  }

  /**
   * Subscribes to `FeedService.subscribeFeed`, replacing the previous poll-timer loop with a real
   * server-push subscription — ref-counted so concurrent callers share one underlying stream.
   */
  beginPolling(): () => void {
    if (this._pollingHandlers++ === 0) {
      this.#reconnectDelay = RECONNECT_INITIAL_DELAY;
      this.#subscribeToFeed(++this.#subscriptionGeneration);
    }

    return () => {
      if (--this._pollingHandlers === 0) {
        this.#teardownFeedSubscription();
      }
    };
  }

  /**
   * Opens the shared `subscribeFeed` stream. On a stream error (the RPC connection dropping, say)
   * this reopens after a backoff delay rather than leaving the handle without updates for the rest
   * of its session — the poll loop it replaced self-healed on its next tick, so this subscription
   * needs an equivalent recovery path. `generation` guards a reconnect scheduled by an earlier,
   * now-superseded subscription (unsubscribed, or replaced by a fresh `beginPolling()`) from firing.
   */
  #subscribeToFeed(generation: number): void {
    this.#feedSubscriptionCleanup = subscribeStream(
      this._runtime,
      this._service['FeedService.subscribeFeed']({
        query: {
          feedNamespace: this._namespace,
          spaceId: this._spaceId,
          feedIds: [this._feedId],
        },
      }),
      {
        onData: (result) => {
          this.#reconnectDelay = RECONNECT_INITIAL_DELAY;
          const refreshId = ++this._refreshId;
          void this.#applyQueryResult(refreshId, result);
        },
        onError: (error) => {
          if (!(error instanceof RpcClosedError)) {
            log.catch(error);
          }
          this._error = error;
          this._isLoading = false;
          this.#feedSubscriptionCleanup = null;
          this.updated.emit();
          if (generation === this.#subscriptionGeneration && this._pollingHandlers > 0 && !this._ctx.disposed) {
            const delay = this.#reconnectDelay;
            this.#reconnectDelay = Math.min(this.#reconnectDelay * 2, RECONNECT_MAX_DELAY);
            this.#reconnectTimer = setTimeout(() => {
              this.#reconnectTimer = null;
              this.#subscribeToFeed(generation);
            }, delay);
          }
        },
      },
    );
  }

  /** Tears down the active subscription and cancels any pending reconnect. */
  #teardownFeedSubscription(): void {
    this.#subscriptionGeneration++;
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
    this.#feedSubscriptionCleanup?.();
    this.#feedSubscriptionCleanup = null;

    // Release the last snapshot with the subscription that produced it. The array is a strong
    // reference to every object the feed contained, so keeping it past the last subscriber would
    // pin the whole working set for the life of the handle — and it is stale from this point
    // anyway, since nothing is left to refresh it.
    this._objects = [];
    this.#objectIds.clear();
  }

  async dispose() {
    // Drain before teardown: a same-tick `Obj.update` is still queued for the background append,
    // so clearing `#dirtyCores` first would drop it. Runs while the scheduler and service are still
    // live, and cannot reject — `waitForPendingWrites` is best-effort by contract.
    await this.waitForPendingWrites();

    this._pollingHandlers = 0;
    this.#teardownFeedSubscription();
    for (const core of this.#cores.values()) {
      core.dispose();
    }
    this.#cores.clear();
    this.#dirtyCores.clear();
    await this._ctx.dispose();
    await this._refreshTask.join();
  }
}

const objectSetChanged = (before: Entity.Unknown[], after: Entity.Unknown[]) => {
  if (before.length !== after.length) {
    return true;
  }

  // TODO(dmaretskyi):  We might want to compare the objects data.
  return before.some((item, index) => item.id !== after[index].id);
};

const isSqliteNotOpenError = (err: any) => err.cause?.message?.includes('The database connection is not open');
