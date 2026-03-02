//
// Copyright 2025 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { DeferredTask } from '@dxos/async';
import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Database, Entity, Obj, type Ref } from '@dxos/echo';
import { type ObjectJSON, SelfDXNId, assertObjectModel, setRefResolverOnData } from '@dxos/echo/internal';
import { defineHiddenProperty } from '@dxos/echo/internal';
import { assertArgument, failedInvariant } from '@dxos/invariant';
import { type DXN, type ObjectId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Echo } from '@dxos/protocols';
import { create } from '@dxos/protocols/buf';
import {
  DeleteFromQueueRequestSchema,
  InsertIntoQueueRequestSchema,
  QueryQueueRequestSchema,
  SyncQueueRequestSchema,
} from '@dxos/protocols/buf/dxos/client/queue_pb';

import { Filter, Query, QueryResultImpl } from '../query';

import { QueueQueryContext } from './queue-query-context';
import type { Queue } from './types';

const TRACE_QUEUE_LOAD = false;

// Appending large amount of objects at once is not supported by the server.
// https://linear.app/dxos/issue/DX-449/queueappend-fails-when-there-are-too-many-objects-due-to-there-being
const QUEUE_APPEND_BATCH_SIZE = 15;

const POLLING_INTERVAL = 1_000;

/**
 * Client-side view onto an EDGE queue.
 */
export class QueueImpl<T extends Entity.Unknown = Entity.Unknown> implements Queue<T> {
  private readonly _ctx = new Context();

  public readonly updated = new Event()

;

  private readonly _refreshTask = new DeferredTask(this._ctx, async () => {
    const thisRefreshId = ++this._refreshId;
    let changed = false;
    try {
      TRACE_QUEUE_LOAD &&
        log.info('queue refresh begin', { currentObjects: this._objects.length, refreshId: thisRefreshId });
      const { objects } = await this._service.queryQueue(
        create(QueryQueueRequestSchema, {
          query: {
            queuesNamespace: this._subspaceTag,
            spaceId: this._spaceId,
            queueIds: [this._queueId],
          },
        }),
      );
      TRACE_QUEUE_LOAD && log.info('items fetched', { refreshId: thisRefreshId, count: objects?.length ?? 0 });
      if (thisRefreshId !== this._refreshId) {
        return;
      }
      if (this._ctx.disposed) {
        return;
      }

      const decodedObjects = await Promise.all(
        (objects ?? []).map(async (obj) => {
          try {
            return await Obj.fromJSON(obj, {
              refResolver: this._refResolver,
              dxn: this._dxn.extend([(obj as { id?: string }).id ?? '']),
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
        this._objectCache.set(obj.id, obj as T);
      }

      changed = objectSetChanged(this._objects, decodedObjects);

      TRACE_QUEUE_LOAD &&
        log.info('queue refresh', { changed, objects: objects?.length ?? 0, refreshId: thisRefreshId });
      this._objects = decodedObjects as T[];
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
  })

;

  private readonly _subspaceTag: string

;

  private readonly _spaceId: SpaceId

;

  private readonly _queueId: string

;

  /**
   * Number of active polling handlers.
   */

  private _pollingHandlers: number = 0

;

  private _objectCache = new Map<ObjectId, T>()

;

  private _objects: T[] = []

;

  private _isLoading = true

;

  private _error: Error | null = null

;

  private _refreshId = 0

;

  private _querying = false

;

  constructor(
    private readonly _service: Echo.QueueService,
    private readonly _refResolver: Ref.Resolver,
    private readonly _dxn: DXN,
  ) {
    const { subspaceTag, spaceId, queueId } = this._dxn.asQueueDXN() ?? {};
    this._subspaceTag = subspaceTag ?? failedInvariant();
    this._spaceId = spaceId ?? failedInvariant();
    this._queueId = queueId ?? failedInvariant();
  }

  toJSON() {
    return {
      dxn: this._dxn.toString(),
      objects: this._objects.length,
    };
  }

  // TODO(burdon): Rename to objects.

  get dxn() {
    return this._dxn;
  }

  /**
   * Subscribe to queue updates.
   */

  subscribe(callback: () => void): () => void {
    return this.updated.on(callback);
  }

  /**
   * @deprecated Use `query` method instead.
   */

  get isLoading(): boolean {
    return this._isLoading;
  }

  /**
   * @deprecated Use `query` method instead.
   */

  get error(): Error | null {
    return this._error;
  }

  /**
   * @deprecated Use `query` method instead.
   */

  get objects(): T[] {
    return this.getObjectsSync();
  }

  get refResolver(): Ref.Resolver {
    return this._refResolver;
  }

  /**
   * Insert into queue with optimistic update.
   */

  async append(items: T[]): Promise<void> {
    items.forEach((item) => assertObjectModel(item));

    for (const item of items) {
      setRefResolverOnData(item, this._refResolver);
      defineHiddenProperty(item, SelfDXNId, this._dxn.extend([item.id]));
    }

    // Optimistic update.
    this._objects = [...this._objects, ...items];
    for (const item of items) {
      this._objectCache.set(item.id, item as T);
    }
    this.updated.emit();

    const json = items.map((item) => Entity.toJSON(item));

    try {
      for (let i = 0; i < json.length; i += QUEUE_APPEND_BATCH_SIZE) {
        await this._service.insertIntoQueue(
          create(InsertIntoQueueRequestSchema, {
            subspaceTag: this._subspaceTag,
            spaceId: this._spaceId,
            queueId: this._queueId,
            // ObjectJSON[] is structurally compatible with google.protobuf.Struct[] at runtime.
            objects: json.slice(i, i + QUEUE_APPEND_BATCH_SIZE) as never,
          }),
        );
      }
    } catch (err) {
      log.catch(err);
      this._error = err as Error;
      this.updated.emit();
    }
  }

  async delete(ids: string[]): Promise<void> {
    // Optimistic update.
    // TODO(dmaretskyi): Restrict types.
    this._objects = this._objects.filter((item) => !ids.includes(item.id));
    for (const id of ids) {
      this._objectCache.delete(id);
    }
    this.updated.emit();

    try {
      await this._service.deleteFromQueue(
        create(DeleteFromQueueRequestSchema, {
          subspaceTag: this._subspaceTag,
          spaceId: this._spaceId,
          queueId: this._queueId,
          objectIds: ids,
        }),
      );
    } catch (err) {
      this._error = err as Error;
      this.updated.emit();
    }
  }

  // Odd way to define method's types from a typedef.

  declare query: Database.QueryFn

;

  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(queryOrFilter: Query.Any | Filter.Any, options?: Database.QueryOptions) {
    assertArgument(options === undefined, 'options', 'not supported');
    const query = Filter.is(queryOrFilter) ? Query.select(queryOrFilter) : queryOrFilter;
    const queryWithOptions = query.options({
      spaceIds: [this._spaceId],
      queues: [this._dxn.toString()],
    });
    return new QueryResultImpl(new QueueQueryContext(this), queryWithOptions);
  }

  /**
   * @deprecated Use `query` method instead.
   */

  async queryObjects(): Promise<T[]> {
    const objects = await this.fetchObjectsJSON();
    const decodedObjects = await Promise.all(
      objects
        .map(async (obj) => {
        const decoded = await Obj.fromJSON(obj, {
          refResolver: this._refResolver,
          dxn: this._dxn.extend([(obj as { id?: string }).id ?? '']),
        });
        this._objectCache.set(decoded.id, decoded as T);
        return decoded;
      }),
    );

    return decodedObjects as T[];
  }

  async fetchObjectsJSON(): Promise<ObjectJSON[]> {
    const { objects } = await this._service.queryQueue(
      create(QueryQueueRequestSchema, {
        query: {
          queuesNamespace: this._subspaceTag,
          spaceId: this._spaceId,
          queueIds: [this._queueId],
        },
      }),
    );
    return objects as ObjectJSON[];
  }

  async hydrateObject(obj: ObjectJSON): Promise<Entity.Unknown> {
    const decoded = await Obj.fromJSON(obj, {
      refResolver: this._refResolver,
      dxn: this._dxn.extend([(obj as { id?: string }).id ?? '']),
    });
    return decoded;
  }

  /**
   * Internal use.
   * Doesn't trigger update events.
   */

  getObjectsSync(): T[] {
    return this._objects;
  }

  /**
   * @deprecated Use `query` method instead.
   */

  async getObjectsById(ids: ObjectId[]): Promise<(T | undefined)[]> {
    const missingIds = ids.filter((id) => !this._objectCache.has(id));
    if (missingIds.length > 0) {
      if (!this._querying) {
        try {
          this._querying = true;
          await this.queryObjects();
        } finally {
          this._querying = false;
        }
      }
    }

    return ids.map((id) => this._objectCache.get(id));
  }

  /**
   * Reload state from server.
   * Overrides optimistic updates.
   * @deprecated Use `query` method instead.
   */

  // TODO(dmaretskyi): Split optimistic into separate state so it doesn't get overridden.

  async refresh(): Promise<void> {
    await this._refreshTask.runBlocking();
  }

  private _pollingInterval: NodeJS.Timeout | null = null

;

;

;

;

;

;

;

;

;

;

;

;

;

;

  // TODO(burdon): Rename to objects.

  /**
   * @deprecated Use `query` method instead.
   */

  /**
   * @deprecated Use `query` method instead.
   */

  /**
   * @deprecated Use `query` method instead.
   */

  // Odd way to define method's types from a typedef.

;

  async sync({
    shouldPush = true,
    shouldPull = true,
  }: { shouldPush?: boolean; shouldPull?: boolean } = {}): Promise<void> {
    await this._service.syncQueue(
      create(SyncQueueRequestSchema, {
        subspaceTag: this._subspaceTag,
        spaceId: this._spaceId,
        queueId: this._queueId,
        shouldPush,
        shouldPull,
      }),
    );
  }

  /**
   * @deprecated Use `query` method instead.
   */

  /**
   * @deprecated Use `query` method instead.
   */

  // TODO(dmaretskyi): Split optimistic into separate state so it doesn't get overridden.

;

  beginPolling(): () => void {
    if (this._pollingHandlers++ === 0) {
      const poll = async () => {
        await this._refreshTask.runBlocking();
        if (this._pollingHandlers > 0) {
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

const isSqliteNotOpenError = (err: unknown) =>
  err instanceof Error &&
  'cause' in err &&
  (err.cause as Error)?.message?.includes('The database connection is not open');
