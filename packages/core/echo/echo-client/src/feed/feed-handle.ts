//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';

import { Event, UpdateScheduler, scheduleTask, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { Entity, type Feed, Obj, type Ref } from '@dxos/echo';
import { EchoFeedCodec } from '@dxos/echo-protocol';
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

// Appending large amount of objects at once is not supported by the server.
// https://linear.app/dxos/issue/DX-449/queueappend-fails-when-there-are-too-many-objects-due-to-there-being
const FEED_APPEND_BATCH_SIZE = 15;

/** One object captured for append: the core it came from, its payload, and its pending-append token. */
type AppendCapture = { core: FeedObjectCore; json: Record<string, unknown>; token: number };

const RECONNECT_INITIAL_DELAY = 1_000;

/**
 * Ceiling for {@link FeedHandle.beginPolling}'s reconnect backoff after a stream error: the delay
 * doubles after each failed attempt, capped here, and resets to {@link RECONNECT_INITIAL_DELAY} the
 * moment a reconnected stream observes data.
 */
const RECONNECT_MAX_DELAY = 30_000;

/** Bounds each feed RPC, so a host that stops answering cannot hold a flush or dispose open. */
const RPC_TIMEOUT = 30_000;

const APPEND_RETRY_INITIAL_DELAY = 1_000;

const APPEND_RETRY_MAX_DELAY = 30_000;

/** Drain passes {@link FeedHandle.waitForPendingWrites} makes before reporting writes as unsendable. */
const FLUSH_ATTEMPTS = 3;

/** Backoff between {@link FLUSH_ATTEMPTS}, multiplied by the attempt number. */
const FLUSH_RETRY_DELAY_MS = 50;

/**
 * Client-side handle for a single feed, backed by an EDGE queue.
 * Internal to echo-client — feed operations are exposed through {@link DatabaseImpl}.
 */
export class FeedHandle {
  private readonly _ctx = new Context();

  public readonly updated = new Event();

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

  /**
   * The feed's objects while subscribed, by id: holds them strongly so the weak core registry keeps
   * serving them, and tells {@link updated} listeners when the set changes.
   */
  #objects = new Map<string, Entity.Unknown>();
  /** Object id of every block the subscription has sent, by block id; what its deltas refer to. */
  #subscriptionBlocks = new Map<string, string>();
  /** Subscription pushes applied in order: a delta only makes sense on top of the push before it. */
  #pushChain: Promise<void> = Promise.resolve();
  private _isLoading = true;
  private _error: Error | null = null;
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

  /**
   * Settles once the scheduled retry has sent; only that task clears it, so at most one retry is
   * outstanding and nothing else sends a dirty core ahead of the backoff.
   */
  #appendRetry: Promise<void> | null = null;
  /** Set by {@link dispose}, whose drain is the last chance to send and so ignores the backoff. */
  #disposing = false;
  #appendRetryDelay = APPEND_RETRY_INITIAL_DELAY;
  /** The error that closed the RPC endpoint, once one has; this handle can never append again. */
  #endpointClosed: Error | null = null;

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
      objects: this.#objects.size,
    };
  }

  /** The last load, subscription, or append failure; an append failure is cleared once every write has been sent. */
  get error(): Error | null {
    return this._error;
  }

  /**
   * Objects resident in this handle's core cache. A superset of the queried working set: a core is
   * registered for every object the handle has hydrated, and is dropped only on `delete` or
   * `dispose`, so this is the retention-relevant count rather than the subscribed object count.
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

    if (this.#endpointClosed) {
      // Revert first: the capture above cleared each core's dirty flag and left a pending-append
      // token, so leaving without it would drop the write AND leave `reconcile` preferring the
      // never-sent local state over every inbound block for the life of the handle.
      for (const { core, token } of batch) {
        core.revertCapture(token);
        // Still unsent, so `dispose` counts it with the other writes the closed endpoint lost.
        this.#dirtyCores.add(core);
      }
      this.updated.emit();
      // The write did not land and this handle can never send it, so resolving would report a
      // success the caller can act on. The handle is replaced when the feed service is swapped.
      throw this.#endpointClosed;
    }

    const sendPromise = this.#sendAppendBatches(batch);
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

  /** Add newly-tracked core entities to the held objects and notify subscribers. */
  #addOptimistic(cores: FeedObjectCore[]): void {
    let added = false;
    for (const core of cores) {
      if (!this.#objects.has(core.entity.id)) {
        this.#objects.set(core.entity.id, core.entity);
        added = true;
      }
    }
    if (added) {
      this.updated.emit();
    }
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
      this.#objects.delete(id);
    }
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
   * Send a captured batch to the feed service, chunked to `FEED_APPEND_BATCH_SIZE` (the server
   * rejects overly large single inserts).
   *
   * A failed chunk carries only itself and the chunks after it into the retry. `insertIntoFeed`
   * assigns a fresh sequence per object, so re-sending a chunk that already committed appends a
   * second block rather than reconciling with the first.
   */
  async #sendAppendBatches(batch: AppendCapture[]): Promise<void> {
    for (let i = 0; i < batch.length; i += FEED_APPEND_BATCH_SIZE) {
      const chunk = batch.slice(i, i + FEED_APPEND_BATCH_SIZE);
      try {
        const { blocks } = await runServiceCall(
          this._runtime,
          this._service['FeedService.insertIntoFeed']({
            subspaceTag: this._namespace,
            spaceId: this._spaceId,
            feedId: this._feedId,
            objects: chunk.map(({ json }) => JSON.stringify(json)),
          }),
          { timeout: RPC_TIMEOUT },
        );
        chunk.forEach(({ core, token }, index) => core.confirmAppend(token, blocks?.[index]));
      } catch (err) {
        this.#onAppendFailed(err, batch.slice(i));
        // A closed endpoint never retries, so the write is lost and the caller must hear it.
        if (isEndpointClosedError(err)) {
          throw err;
        }
        return;
      }
    }
    this.#appendRetryDelay = APPEND_RETRY_INITIAL_DELAY;
    // Sends run concurrently, so this one succeeding says nothing of a failed batch still awaiting its retry.
    if (this.#dirtyCores.size === 0) {
      this._error = null;
    }
  }

  #onAppendFailed(err: unknown, batch: AppendCapture[]): void {
    const endpointClosed = isEndpointClosedError(err);
    if (!endpointClosed) {
      log.catch(err);
    }
    this._error = err as Error;
    this.updated.emit();

    for (const { core, token } of batch) {
      core.revertCapture(token);
      if (!core.deleted) {
        this.#dirtyCores.add(core);
      }
    }

    if (endpointClosed) {
      this.#endpointClosed = err;
      log.verbose('feed append abandoned; rpc endpoint closed', {
        feedId: this._feedId,
        pending: this.#dirtyCores.size,
      });
      return;
    }

    if (this.#appendRetry || this._ctx.disposed) {
      return;
    }
    const delay = this.#appendRetryDelay;
    this.#appendRetryDelay = Math.min(this.#appendRetryDelay * 2, APPEND_RETRY_MAX_DELAY);
    const retry = Promise.withResolvers<void>();
    this.#appendRetry = retry.promise;
    // Releases flushes waiting on a retry that disposal cancelled.
    const clearDispose = this._ctx.onDispose(() => retry.resolve());
    scheduleTask(
      this._ctx,
      async () => {
        clearDispose();
        // Cleared first, so a failure of this send can schedule the next retry.
        this.#appendRetry = null;
        try {
          await this.#appendScheduler.runBlocking();
        } finally {
          retry.resolve();
        }
      },
      delay,
    );
  }

  /**
   * Flush every dirty core's pending `Obj.update`(s) as a single feed append per core (coalescing).
   * Scheduled via `#appendScheduler`; also runs synchronously (via `runBlocking`) from
   * {@link waitForPendingWrites}.
   */
  async #flushDirty(): Promise<void> {
    // The scheduled retry sends every dirty core, so sending sooner would defeat the backoff.
    if (this.#dirtyCores.size === 0 || (this.#appendRetry && !this.#disposing)) {
      return;
    }
    if (this.#endpointClosed) {
      // Recorded rather than skipped in silence: this handle can never send these, so a caller that
      // reads `error` after `waitForPendingWrites` learns the flush wrote nothing. They stay dirty —
      // discarding a local edit here would lose more than it fixes, and `dispose` names the count.
      this._error = this.#endpointClosed;
      this.updated.emit();
      return;
    }
    const batch = [...this.#dirtyCores].map((core) => {
      const { json, token } = core.captureForAppend();
      return { core, json, token };
    });
    this.#dirtyCores.clear();

    const sendPromise = this.#sendAppendBatches(batch);
    this.#inFlight.add(sendPromise);
    try {
      await sendPromise;
    } catch (err) {
      // `#onAppendFailed` already recorded a closed endpoint in `error`; anything else is unexpected.
      if (!isEndpointClosedError(err)) {
        throw err;
      }
    } finally {
      this.#inFlight.delete(sendPromise);
    }
  }

  /**
   * Wait for every pending local `Obj.update` to be captured and sent (not for it to be echoed back
   * through polling — the index that serves queries is caught up synchronously by the query host
   * itself, so callers don't need to wait on our own poll cycle). Mirrors `RepoProxy.flush`.
   *
   * While an append is failing, a drain waits for the scheduled retry rather than sending ahead of
   * the backoff, and throws if that retry fails too.
   *
   * Throws if writes are still unsent after {@link FLUSH_ATTEMPTS} drains, or at once when the endpoint is closed.
   */
  async waitForPendingWrites(): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      const retry = this.#disposing ? null : this.#appendRetry;
      if (retry) {
        await retry;
      } else if (this.#dirtyCores.size > 0) {
        await this.#appendScheduler.runBlocking();
      }
      await Promise.allSettled([...this.#inFlight]);
      if (this.#dirtyCores.size === 0) {
        return;
      }
      if (this.#endpointClosed) {
        throw this.#endpointClosed;
      }
      if (retry || attempt >= FLUSH_ATTEMPTS) {
        throw this._error ?? new Error('Feed writes could not be sent.');
      }
      if (!this.#appendRetry) {
        await sleep(FLUSH_RETRY_DELAY_MS * attempt);
      }
    }
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
    return parseObjects(objects);
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
      const ref = EchoFeedCodec.blockOf(json);
      if (!existingCore.accepts(ref)) {
        return existingCore.entity;
      }
      try {
        const decoded = await Obj.fromJSON(json, {
          refResolver: this._refResolver,
          uri: EID.make({ spaceId: this._spaceId, entityId: id }),
          database: this._database,
          parent: this._parentEntity,
        });
        existingCore.reconcile(decoded, ref);
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
    return [...(await this.#upsertAll(await this.fetchObjectsJSON())).values()];
  }

  /**
   * Upserts a batch of objects, in order for blocks of the same object: concurrent upserts of a new
   * id share one hydration, which would apply only the first of its blocks.
   */
  async #upsertAll(objects: readonly ObjectJSON[]): Promise<Map<string, Entity.Unknown>> {
    const byId = new Map<string, ObjectJSON[]>();
    for (const json of objects) {
      byId.set(json.id, [...(byId.get(json.id) ?? []), json]);
    }
    const entities = new Map<string, Entity.Unknown>();
    await Promise.all(
      [...byId].map(async ([id, blocks]) => {
        for (const json of blocks) {
          const entity = await this.upsertFromJSON(json);
          if (entity !== undefined) {
            entities.set(id, entity);
          }
        }
      }),
    );
    return entities;
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
          this.#pushChain = this.#pushChain
            .then(() => this.#applyPush(generation, result))
            .catch((err) => log.catch(err));
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

  /**
   * Applies one `subscribeFeed` push: a full snapshot replaces the set of objects, a delta adds the
   * blocks written since and adopts the positions and removals it reports. Only new blocks are
   * decoded; a push from a superseded subscription is dropped.
   */
  async #applyPush(generation: number, result: FeedService.FeedQueryResult): Promise<void> {
    if (generation !== this.#subscriptionGeneration || this._ctx.disposed) {
      return;
    }
    const objects = parseObjects(result.objects);
    const entities = await this.#upsertAll(objects);
    if (generation !== this.#subscriptionGeneration || this._ctx.disposed) {
      return;
    }

    const blocks = result.delta === true ? new Map(this.#subscriptionBlocks) : new Map<string, string>();
    const next = result.delta === true ? new Map(this.#objects) : new Map<string, Entity.Unknown>();
    for (const json of objects) {
      const entity = entities.get(json.id);
      if (entity !== undefined) {
        blocks.set(blockKeyOf(json), json.id);
        next.set(json.id, entity);
      }
    }
    for (const { block, position } of result.positions ?? []) {
      const id = blocks.get(block);
      if (id !== undefined && EntityId.isValid(id)) {
        this.#cores.get(id)?.reposition(block, position);
      }
    }
    const removedIds = new Set<string>();
    for (const block of result.removed ?? []) {
      const id = blocks.get(block);
      if (id !== undefined) {
        removedIds.add(id);
        blocks.delete(block);
      }
    }
    if (removedIds.size > 0) {
      // Only the ids that lost their last block: an optimistic append not yet echoed stays.
      const held = new Set(blocks.values());
      for (const id of removedIds) {
        if (!held.has(id)) {
          next.delete(id);
        }
      }
    }

    const changed = next.size !== this.#objects.size || [...next.keys()].some((id) => !this.#objects.has(id));
    this.#subscriptionBlocks = blocks;
    this.#objects = next;
    this._isLoading = false;
    if (changed) {
      this.updated.emit();
    }
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
    this.#objects = new Map();
    this.#subscriptionBlocks = new Map();
  }

  /** Throws after teardown if writes could not be sent, since nothing carries them to a handle that replaces this one. */
  async dispose() {
    // Drain before teardown: a same-tick `Obj.update` is still queued for the background append,
    // so clearing `#dirtyCores` first would drop it. Runs while the scheduler and service are still live.
    this.#disposing = true;
    const unsent = await this.waitForPendingWrites().then(
      () => undefined,
      (err: unknown) => err,
    );
    const lost = this.#dirtyCores.size;

    this._pollingHandlers = 0;
    this.#teardownFeedSubscription();
    for (const core of this.#cores.values()) {
      core.dispose();
    }
    this.#cores.clear();
    this.#dirtyCores.clear();
    await this._ctx.dispose();
    await this.#pushChain;
    if (unsent !== undefined) {
      throw new Error(`Feed handle disposed with ${lost} unsent writes.`, { cause: unsent });
    }
  }
}

/** Whether `err` is, or is caused through a chain of errors by, a closed rpc endpoint. */
const isEndpointClosedError = (err: unknown): err is Error => {
  const seen = new Set<Error>();
  let cause = err;
  while (cause instanceof Error && !seen.has(cause)) {
    if (cause instanceof RpcClosedError) {
      return true;
    }
    seen.add(cause);
    cause = cause.cause;
  }
  return false;
};

/** Parses a feed result's encoded objects, skipping any that are not valid object JSON. */
const parseObjects = (encoded: readonly string[] | undefined): ObjectJSON[] =>
  (encoded ?? []).flatMap((entry) => {
    try {
      const obj = JSON.parse(entry) as ObjectJSON;
      if (!EntityId.isValid(obj.id)) {
        log.verbose('feed object missing valid id; ignored', { obj });
        return [];
      }
      return [obj];
    } catch (err) {
      log.verbose('feed object JSON parse failed; object ignored', { encoded: entry, error: err });
      return [];
    }
  });

/** A block's id, or the object's for a store that stamps none (it sends full snapshots only). */
const blockKeyOf = (json: ObjectJSON): string => {
  const { actorId, sequence } = EchoFeedCodec.blockOf(json);
  return actorId !== undefined && sequence !== undefined
    ? EchoFeedCodec.blockId(actorId, sequence)
    : `object:${json.id}`;
};
