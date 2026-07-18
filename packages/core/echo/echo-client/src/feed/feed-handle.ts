//
// Copyright 2025 DXOS.org
//

import * as Predicate from 'effect/Predicate';
import * as Runtime from 'effect/Runtime';

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
import { runServiceCall } from '@dxos/protocols';
import { type FeedService } from '@dxos/protocols/rpc';

import { type DatabaseImpl } from '../proxy-db';
import { FeedObjectCore } from './feed-object-core';

const TRACE_FEED_LOAD = false;

// Appending large amount of objects at once is not supported by the server.
// https://linear.app/dxos/issue/DX-449/queueappend-fails-when-there-are-too-many-objects-due-to-there-being
const FEED_APPEND_BATCH_SIZE = 15;

const POLLING_INTERVAL = 1_000;

/**
 * Client-side handle for a single feed, backed by an EDGE queue.
 * Internal to echo-client — feed operations are exposed through {@link DatabaseImpl}.
 */
export class FeedHandle {
  private readonly _ctx = new Context();

  public readonly updated = new Event();

  private readonly _refreshTask = new DeferredTask(this._ctx, async () => {
    const thisRefreshId = ++this._refreshId;
    let changed = false;
    try {
      TRACE_FEED_LOAD &&
        log.info('feed refresh begin', { currentObjects: this._objects.length, refreshId: thisRefreshId });
      const { objects } = await runServiceCall(
        this._runtime,
        this._service.FeedService.queryFeed({
          query: {
            feedNamespace: this._namespace,
            spaceId: this._spaceId,
            feedIds: [this._feedId],
          },
        }),
      );
      TRACE_FEED_LOAD && log.info('items fetched', { refreshId: thisRefreshId, count: objects?.length ?? 0 });
      if (thisRefreshId !== this._refreshId) {
        return;
      }
      if (this._ctx.disposed) {
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

      // Routes through the same core-tracking materialization as query hydration, so a polled
      // re-read never clobbers a not-yet-echoed local `Obj.update` and preserves entity identity.
      const decodedObjects = await Promise.all(parsedObjects.map((obj) => this.upsertFromJSON(obj))).then((objects) =>
        objects.filter(Predicate.isNotUndefined),
      );

      if (thisRefreshId !== this._refreshId) {
        return;
      }

      changed = objectSetChanged(this._objects, decodedObjects);

      TRACE_FEED_LOAD && log.info('feed refresh', { changed, objects: objects?.length ?? 0, refreshId: thisRefreshId });
      this._objects = decodedObjects;
    } catch (err) {
      // TODO(dmaretskyi): This task occasionally fails with "The database connection is not open" error in tests -- some issue with teardown ordering.
      //                   We should find the root cause and fix it instead of muting the error.
      if (!isSqliteNotOpenError(err)) {
        log.catch(err);
      }
      this._error = err as Error;
    } finally {
      this._isLoading = false;
      if (changed) {
        this.updated.emit();
      }
    }
  });

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

  /** Per-object client-side state, keyed by id — the single source of truth for entity identity. */
  readonly #cores = new Map<EntityId, FeedObjectCore>();
  /** Cores with a local `Obj.update` not yet captured for append. */
  readonly #dirtyCores = new Set<FeedObjectCore>();
  /** In-flight append RPCs, awaited by {@link waitForPendingWrites}. */
  readonly #inFlight = new Set<Promise<void>>();
  /** Dedupes concurrent hydrations of the same id (reactive query + one-shot query racing). */
  readonly #hydrating = new Map<EntityId, Promise<Entity.Unknown | undefined>>();

  private _objects: Entity.Unknown[] = [];
  private _isLoading = true;
  private _error: Error | null = null;
  private _refreshId = 0;
  private _loadObjectsPromise: Promise<Entity.Unknown[]> | undefined;

  constructor(
    private readonly _service: FeedService.Client,
    private readonly _runtime: Runtime.Runtime<never>,
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

      const id = item.id as EntityId;
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
    const existingIds = new Set(this._objects.map((obj) => obj.id));
    this._objects = [...this._objects, ...cores.map((core) => core.entity).filter((obj) => !existingIds.has(obj.id))];
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
      const core = this.#cores.get(id as EntityId);
      if (core) {
        core.markDeleted();
        this.#cores.delete(id as EntityId);
        this.#dirtyCores.delete(core);
      }
    }
    this._objects = this._objects.filter((item) => !ids.includes(item.id));
    this.updated.emit();

    try {
      await runServiceCall(
        this._runtime,
        this._service.FeedService.deleteFromFeed({
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
        this._service.FeedService.insertIntoFeed({
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
      this._service.FeedService.syncFeed({
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
      this._service.FeedService.getSyncState({
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
      this._service.FeedService.queryFeed({
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

  async hydrateObject(obj: ObjectJSON): Promise<Entity.Unknown> {
    invariant(EntityId.isValid(obj.id), 'object missing valid id');
    const decoded = await Obj.fromJSON(obj, {
      refResolver: this._refResolver,
      uri: EID.make({ spaceId: this._spaceId, entityId: obj.id }),
      database: this._database,
      parent: this._parentEntity,
    });
    return decoded;
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
    const id = json.id as EntityId;

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
    this.#cores.set(entity.id as EntityId, core);
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
    const missingIds = ids.filter((id) => !this.#cores.has(id));
    if (missingIds.length > 0) {
      this._loadObjectsPromise ??= this._loadObjects().finally(() => {
        this._loadObjectsPromise = undefined;
      });
      await this._loadObjectsPromise;
    }

    return ids.map((id) => this.#cores.get(id)?.entity);
  }

  private async _loadObjects(): Promise<Entity.Unknown[]> {
    const objects = await this.fetchObjectsJSON();
    const decodedObjects = await Promise.all(
      objects.filter((obj) => EntityId.isValid(obj.id)).map((obj) => this.upsertFromJSON(obj)),
    ).then((objects) => objects.filter(Predicate.isNotUndefined));

    return decodedObjects;
  }

  private _pollingInterval: NodeJS.Timeout | null = null;

  beginPolling(): () => void {
    if (this._pollingHandlers++ === 0) {
      const poll = async () => {
        await this._refreshTask.runBlocking();
        if (this._pollingHandlers > 0 && !this._ctx.disposed) {
          this._pollingInterval = setTimeout(poll, POLLING_INTERVAL);
        }
      };
      queueMicrotask(poll);
    }

    return () => {
      if (--this._pollingHandlers === 0) {
        clearTimeout(this._pollingInterval!);
        this._pollingInterval = null;
      }
    };
  }

  async dispose() {
    this._pollingHandlers = 0;
    if (this._pollingInterval) {
      clearTimeout(this._pollingInterval);
      this._pollingInterval = null;
    }
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
