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
import { type FeedProtocol } from '@dxos/protocols';

import { type DatabaseImpl } from '../proxy-db';
import { QueryResultCache, QueryResultImpl } from '../query';
import { FeedQueryContext } from './feed-query-context';

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
      const { objects } = await this._service.queryQueue({
        query: {
          queuesNamespace: this._namespace,
          spaceId: this._spaceId,
          queueIds: [this._feedId],
        },
      });
      TRACE_FEED_LOAD && log.info('items fetched', { refreshId: thisRefreshId, count: objects?.length ?? 0 });
      if (thisRefreshId !== this._refreshId) {
        return;
      }
      if (this._ctx.disposed) {
        return;
      }

      const decodedObjects = await Promise.all(
        (objects ?? []).map(async (encoded) => {
          let obj: ObjectJSON;
          try {
            obj = JSON.parse(encoded) as ObjectJSON;
          } catch (err) {
            log.verbose('feed object JSON parse failed; object ignored', { encoded, error: err });
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

      if (thisRefreshId !== this._refreshId) {
        return;
      }

      for (const obj of decodedObjects) {
        this._objectCache.set(obj.id, obj);
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

  private readonly _spaceId: SpaceId;
  private readonly _feedId: string;

  /**
   * Number of active polling handlers.
   */
  private _pollingHandlers: number = 0;

  private _parentEntity: Obj.Unknown | undefined = undefined;

  private _objectCache = new Map<EntityId, Entity.Unknown>();
  private _objects: Entity.Unknown[] = [];
  private _isLoading = true;
  private _error: Error | null = null;
  private _refreshId = 0;
  private _loadObjectsPromise: Promise<Entity.Unknown[]> | undefined;

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
    }
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

  async fetchObjectsJSON(): Promise<ObjectJSON[]> {
    const { objects } = await this._service.queryQueue({
      query: {
        queuesNamespace: this._namespace,
        spaceId: this._spaceId,
        queueIds: [this._feedId],
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
      await this._loadObjectsPromise;
    }

    return ids.map((id) => this._objectCache.get(id));
  }

  private async _loadObjects(): Promise<Entity.Unknown[]> {
    const objects = await this.fetchObjectsJSON();
    const decodedObjects = await Promise.all(
      objects
        .filter((obj) => EntityId.isValid(obj.id))
        .map(async (obj) => {
          try {
            const decoded = await this.hydrateObject(obj);
            this._objectCache.set(decoded.id, decoded);
            return decoded;
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
