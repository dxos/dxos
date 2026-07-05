//
// Copyright 2025 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { DeferredTask, Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Database, Entity, type Feed, Obj, type Query, type Ref } from '@dxos/echo';
import { type ObjectJSON, ParentId, SelfURIId, assertObjectModel, setRefResolverOnData } from '@dxos/echo/internal';
import { defineHiddenProperty } from '@dxos/echo/internal';
import { failedInvariant, invariant } from '@dxos/invariant';
import { EID, EntityId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedProtocol } from '@dxos/protocols';

import { type DatabaseImpl } from '../proxy-db';
import { QueryResultCache, QueryResultImpl } from '../query';
import { FeedQueryContext } from './feed-query-context';

// Appending large amount of objects at once is not supported by the server.
// https://linear.app/dxos/issue/DX-449/queueappend-fails-when-there-are-too-many-objects-due-to-there-being
const FEED_APPEND_BATCH_SIZE = 15;

const POLLING_INTERVAL = 1_000;

// Client-side retention bounds (in objects) for a feed. The working set is capped so appending or
// reading a large feed never retains the whole thing decoded on the main thread (the cause of the
// mailbox OOM). `DEFAULT` applies to a feed with no active query (e.g. a background append target
// during sync); active windowed queries raise it to their window; an unbounded query raises it to
// `HARD_CAP`. Kept generous so typical feeds (calendars, channels) are never truncated while a
// pathological feed (all-mail, tens of thousands) stays bounded — trims are logged, never silent.
const DEFAULT_RETENTION = 200;
const HARD_CAP_RETENTION = 500;

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
      // Cheap reconciliation: the local block count is monotonic under append (feed items, tags, and
      // even tombstone deletes are all appends), so an *unchanged* count means nothing landed since
      // the last poll — skip the fetch + decode entirely (this replaces the previous per-second
      // full re-fetch + re-decode of the whole feed). A *decrease* means blocks were physically
      // removed, which a cursor-only delta can't observe, so force a full refresh.
      const { totalBlocks } = await this.getSyncState();
      if (thisRefreshId !== this._refreshId || this._ctx.disposed) {
        return;
      }

      // Nothing landed since the last successful poll — skip fetch + decode entirely. Decoupled from
      // the delta/full decision so it also applies to feeds whose tail is unpositioned (an empty
      // cursor forces a full read, but only once something actually changes).
      if (!this._needsFullRefresh && totalBlocks === this._trackedTotalBlocks) {
        return;
      }

      const full =
        this._needsFullRefresh || this._feedCursor === undefined || totalBlocks < this._trackedTotalBlocks;

      // A full refresh reads only the newest `_retention` (a reverse tail read), so the whole feed is
      // never decoded/retained on the main thread. A delta poll fetches only blocks after the cursor.
      const { objects } = await this._service.queryQueue({
        query: {
          queuesNamespace: this._namespace,
          spaceId: this._spaceId,
          queueIds: [this._feedId],
          ...(full ? { limit: this._retention, reverse: true } : { after: this._feedCursor }),
        },
      });
      if (thisRefreshId !== this._refreshId || this._ctx.disposed) {
        return;
      }

      // Reverse tail reads come back newest-first; flip to ascending (append) order to match the
      // delta path and `getResults`.
      const decodedObjects = full
        ? (await this._decodeObjects(objects)).reverse()
        : await this._decodeObjects(objects);
      if (thisRefreshId !== this._refreshId || this._ctx.disposed) {
        return;
      }

      if (full) {
        changed = objectSetChanged(this._objects, decodedObjects);
        this._setObjects(decodedObjects);
        this._needsFullRefresh = false;
      } else {
        changed = this._mergeDelta(decodedObjects);
        this._trimToRetention();
      }
      // Advance the cursor to the newest queue position seen (derived from the objects' injected
      // position meta, so it is correct regardless of read direction). An unpositioned tail (blocks
      // pending push to the server, which assigns positions) contributes no position, so the cursor
      // holds and the tracked-count check re-polls the delta until those blocks are positioned.
      this._feedCursor =
        this._maxQueuePosition(decodedObjects, full ? undefined : this._feedCursor) ?? this._feedCursor;
      this._trackedTotalBlocks = totalBlocks;
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

  private readonly _spaceId: SpaceId;
  private readonly _feedId: string;

  /**
   * Number of active polling handlers.
   */
  private _pollingHandlers: number = 0;

  private _parentEntity: Obj.Unknown | undefined = undefined;

  private _objectCache = new Map<EntityId, Entity.Unknown>();
  private _objects: Entity.Unknown[] = [];
  // Id set mirroring `_objects`, so delta merges can test membership in O(1) instead of scanning.
  private _objectIds = new Set<EntityId>();
  private _isLoading = true;
  private _error: Error | null = null;
  private _refreshId = 0;
  private _loadObjectsPromise: Promise<Entity.Unknown[]> | undefined;

  // Incremental-poll state (see `_refreshTask`). The cursor is the queue position boundary of the
  // last poll; the tracked count is the total block count observed then; the flag forces the next
  // poll to re-read the feed (first load, after `sync()`, on a reconciliation mismatch, or when the
  // retention window grows).
  private _feedCursor: string | undefined = undefined;
  private _trackedTotalBlocks = 0;
  private _needsFullRefresh = true;

  // Client-side retention window: `_objects`/`_objectCache` hold at most the newest `_retention`
  // items, so appending or reading a large feed does not retain every decoded object on the main
  // thread. Computed from the active queries' window limits (see `registerWindow`), always finite
  // and capped at `HARD_CAP_RETENTION`.
  private _retention: number = DEFAULT_RETENTION;
  readonly #windowCounts = new Map<number, number>();

  // Shares one QueryResult instance (and its subscription) across repeated calls with the same
  // serialized query against this feed.
  readonly #queryResultCache = new QueryResultCache();

  constructor(
    private readonly _service: FeedProtocol.QueueService,
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
   * Insert into feed with optimistic update.
   */
  async append(items: Entity.Unknown[]): Promise<void> {
    items.forEach((item) => assertObjectModel(item));

    for (const item of items) {
      setRefResolverOnData(item, this._refResolver);
      defineHiddenProperty(item, SelfURIId, EID.make({ spaceId: this._spaceId, entityId: item.id }));
      if (this._parentEntity) {
        defineHiddenProperty(item, ParentId, this._parentEntity);
      }
    }

    // Optimistic update.
    this._objects = [...this._objects, ...items];
    for (const item of items) {
      this._objectCache.set(item.id, item);
      this._objectIds.add(item.id);
    }
    // Bound the working set: appending a large feed (e.g. a sync) would otherwise retain every item.
    this._trimToRetention();
    this.updated.emit();

    const encoded = items.map((item) => JSON.stringify(Entity.toJSON(item)));

    try {
      for (let i = 0; i < encoded.length; i += FEED_APPEND_BATCH_SIZE) {
        await this._service.insertIntoQueue({
          subspaceTag: this._namespace,
          spaceId: this._spaceId,
          queueId: this._feedId,
          objects: encoded.slice(i, i + FEED_APPEND_BATCH_SIZE),
        });
      }
    } catch (err) {
      log.catch(err);
      this._error = err as Error;
      this.updated.emit();
    }
  }

  async delete(ids: string[]): Promise<void> {
    // Optimistic update.
    this._objects = this._objects.filter((item) => !ids.includes(item.id));
    for (const id of ids) {
      this._objectCache.delete(id);
      this._objectIds.delete(id);
    }
    this.updated.emit();

    try {
      await this._service.deleteFromQueue({
        subspaceTag: this._namespace,
        spaceId: this._spaceId,
        queueId: this._feedId,
        objectIds: ids,
      });
    } catch (err) {
      this._error = err as Error;
      this.updated.emit();
    }
  }

  // Odd way to define method's types from a typedef.
  declare query: Database.QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(query: Query.Any) {
    return this.#queryResultCache.getOrCreate(
      query,
      () => new QueryResultImpl(new FeedQueryContext(this, this._ctx), query),
    );
  }

  async sync({
    shouldPush = true,
    shouldPull = true,
  }: { shouldPush?: boolean; shouldPull?: boolean } = {}): Promise<void> {
    await this._service.syncQueue({
      subspaceTag: this._namespace,
      spaceId: this._spaceId,
      queueId: this._feedId,
      shouldPush,
      shouldPull,
    });
    // A push assigns positions to previously-unpositioned local blocks and a pull lands remote
    // blocks, either of which can shift the cursor's meaning; re-read the whole feed once to
    // resynchronize the incremental-poll state.
    this._needsFullRefresh = true;
    if (this._pollingHandlers > 0) {
      this._refreshTask.schedule();
    }
  }

  async getSyncState(): Promise<Feed.SyncState> {
    const response = await this._service.getSyncState({
      spaceId: this._spaceId,
      namespaces: [this._namespace],
    });
    const entry = response.namespaces?.find((state) => state.namespace === this._namespace);
    return {
      blocksToPull: Number(entry?.blocksToPull ?? 0),
      blocksToPush: Number(entry?.blocksToPush ?? 0),
      totalBlocks: Number(entry?.totalBlocks ?? 0),
    };
  }

  async fetchObjectsJSON(options?: { limit?: number; reverse?: boolean }): Promise<ObjectJSON[]> {
    const { objects } = await this._service.queryQueue({
      query: {
        queuesNamespace: this._namespace,
        spaceId: this._spaceId,
        queueIds: [this._feedId],
        ...(options?.limit !== undefined ? { limit: options.limit } : {}),
        ...(options?.reverse !== undefined ? { reverse: options.reverse } : {}),
      },
    });
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
   * One-shot bounded tail read: the most recently appended `limit` objects, newest first, hydrated.
   * Avoids decoding the whole feed for callers that only need the tail (e.g. a dedup seed).
   */
  async fetchLatestObjects(limit: number): Promise<Entity.Unknown[]> {
    const json = await this.fetchObjectsJSON({ limit, reverse: true });
    const hydrated = await Promise.all(
      json.map(async (obj) => {
        try {
          return await this.hydrateObject(obj);
        } catch (err) {
          log.verbose('feed object hydration failed; object skipped', { obj, error: err });
          return undefined;
        }
      }),
    );
    return hydrated.filter((object): object is Entity.Unknown => object !== undefined);
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
   * Internal use.
   * Doesn't trigger update events.
   */
  getObjectsSync(): Entity.Unknown[] {
    return this._objects;
  }

  getCachedObjectById(id: EntityId): Entity.Unknown | undefined {
    return this._objectCache.get(id);
  }

  /**
   * Resolves feed items by id. Used by reference resolution.
   */
  async getObjectsById(ids: EntityId[]): Promise<(Entity.Unknown | undefined)[]> {
    const missingIds = ids.filter((id) => !this._objectCache.has(id));
    if (missingIds.length > 0) {
      this._loadObjectsPromise ??= this._loadObjects().finally(() => {
        this._loadObjectsPromise = undefined;
      });
      // Queues have no id index, so resolution decodes the feed, but only the requested items are
      // cached — caching the whole feed here would defeat the retention window.
      const all = await this._loadObjectsPromise;
      const wanted = new Set(missingIds);
      for (const object of all) {
        if (wanted.has(object.id)) {
          this._objectCache.set(object.id, object);
        }
      }
    }

    return ids.map((id) => this._objectCache.get(id));
  }

  /** Decodes and hydrates a batch of encoded feed objects, dropping any that fail (e.g. tombstones). */
  private _decodeObjects(encoded: string[] | undefined): Promise<Entity.Unknown[]> {
    return Promise.all(
      (encoded ?? []).map(async (item) => {
        let obj: ObjectJSON;
        try {
          obj = JSON.parse(item) as ObjectJSON;
        } catch (err) {
          log.verbose('feed object JSON parse failed; object ignored', { encoded: item, error: err });
          return undefined;
        }
        if (!EntityId.isValid(obj.id)) {
          log.verbose('feed object missing valid id; ignored', { obj });
          return undefined;
        }
        try {
          return await Obj.fromJSON(obj, {
            refResolver: this._refResolver,
            uri: EID.make({ spaceId: this._spaceId, entityId: obj.id }),
            database: this._database,
            parent: this._parentEntity,
          });
        } catch (err) {
          log.verbose('schema validation error; object ignored', { obj, error: err });
          return undefined;
        }
      }),
    ).then((objects) => objects.filter(Predicate.isNotUndefined));
  }

  /** Replaces the full object set (full refresh), keeping the id index and cache in sync. */
  private _setObjects(objects: Entity.Unknown[]): void {
    this._objects = objects;
    this._objectIds = new Set(objects.map((object) => object.id));
    for (const object of objects) {
      this._objectCache.set(object.id, object);
    }
  }

  /**
   * Appends the genuinely-new items from a delta poll to the tail. Feed items are immutable, so an
   * id already held needs no update — skipping it also avoids re-render churn when an unpositioned
   * tail is re-fetched each poll until it is pushed and positioned. Returns whether anything was added.
   */
  private _mergeDelta(delta: Entity.Unknown[]): boolean {
    let added = false;
    for (const object of delta) {
      if (this._objectIds.has(object.id)) {
        continue;
      }
      this._objectIds.add(object.id);
      this._objectCache.set(object.id, object);
      this._objects.push(object);
      added = true;
    }
    return added;
  }

  /**
   * Registers a query's window limit (or `undefined` for an unbounded query). The feed retains the
   * newest `max(active limits)` items — an unbounded query contributes {@link HARD_CAP_RETENTION}, so
   * the working set is always bounded. Reference-counted so repeated registrations of the same limit
   * coexist; balance with {@link unregisterWindow}.
   */
  registerWindow(limit: number | undefined): void {
    const key = limit ?? Number.POSITIVE_INFINITY;
    this.#windowCounts.set(key, (this.#windowCounts.get(key) ?? 0) + 1);
    this._recomputeRetention();
  }

  /** Balances a {@link registerWindow}; drops back to the default window when the last query detaches. */
  unregisterWindow(limit: number | undefined): void {
    const key = limit ?? Number.POSITIVE_INFINITY;
    const count = this.#windowCounts.get(key);
    if (count === undefined) {
      return;
    }
    if (count <= 1) {
      this.#windowCounts.delete(key);
    } else {
      this.#windowCounts.set(key, count - 1);
    }
    this._recomputeRetention();
  }

  private _recomputeRetention(): void {
    let next = DEFAULT_RETENTION;
    for (const key of this.#windowCounts.keys()) {
      // An unbounded query (Infinity) wants as much as possible, capped at the hard limit.
      next = Math.max(next, key === Number.POSITIVE_INFINITY ? HARD_CAP_RETENTION : Math.min(key, HARD_CAP_RETENTION));
    }
    this._setRetention(next);
  }

  private _setRetention(next: number): void {
    const prev = this._retention;
    if (next === prev) {
      return;
    }
    this._retention = next;
    // A wider window needs older items the current tail doesn't hold, so re-read; a narrower one
    // just trims the tail we already have (no items become newly visible).
    if (next > prev) {
      this._needsFullRefresh = true;
      if (this._pollingHandlers > 0) {
        this._refreshTask.schedule();
      }
    } else {
      this._trimToRetention();
    }
  }

  /** Drops the oldest items beyond the retention window from `_objects`, the id set, and the cache. */
  private _trimToRetention(): void {
    if (this._objects.length <= this._retention) {
      return;
    }
    const dropCount = this._objects.length - this._retention;
    for (let i = 0; i < dropCount; i++) {
      const id = this._objects[i].id;
      this._objectIds.delete(id);
      this._objectCache.delete(id);
    }
    this._objects = this._objects.slice(dropCount);
  }

  /** Highest queue position across the given objects (from injected position meta), else `current`. */
  private _maxQueuePosition(objects: Entity.Unknown[], current: string | undefined): string | undefined {
    let max = current !== undefined ? Number(current) : -1;
    for (const object of objects) {
      const position = Entity.getKeys(object, FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id;
      if (position !== undefined) {
        const value = Number(position);
        if (value > max) {
          max = value;
        }
      }
    }
    return max >= 0 ? String(max) : undefined;
  }

  private async _loadObjects(): Promise<Entity.Unknown[]> {
    const objects = await this.fetchObjectsJSON();
    const decodedObjects = await Promise.all(
      objects
        .filter((obj) => EntityId.isValid(obj.id))
        .map(async (obj) => {
          try {
            return await this.hydrateObject(obj);
          } catch (err) {
            log.verbose('schema validation error; object ignored', { obj, error: err });
            return undefined;
          }
        }),
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
