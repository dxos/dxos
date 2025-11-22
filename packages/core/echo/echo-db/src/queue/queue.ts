//
// Copyright 2025 DXOS.org
//

import { DeferredTask } from '@dxos/async';
import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Database, Obj, type Ref, type Relation } from '@dxos/echo';
import {
  type HasId,
  type ObjectJSON,
  SelfDXNId,
  assertObjectModelShape,
  setRefResolverOnData,
} from '@dxos/echo/internal';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { assertArgument, failedInvariant } from '@dxos/invariant';
import { type DXN, type ObjectId, type SpaceId } from '@dxos/keys';
import { defineHiddenProperty } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type QueueService } from '@dxos/protocols';

import { Filter, Query, QueryResult } from '../query';

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
export class QueueImpl<T extends Obj.Any | Relation.Any = Obj.Any | Relation.Any> implements Queue<T> {
  private readonly _signal = compositeRuntime.createSignal();

  public readonly updated = new Event();

  private readonly _refreshTask = new DeferredTask(Context.default(), async () => {
    const thisRefreshId = ++this._refreshId;
    let changed = false;
    try {
      TRACE_QUEUE_LOAD &&
        log.info('queue refresh begin', { currentObjects: this._objects.length, refreshId: thisRefreshId });
      const { objects } = await this._service.queryQueue(this._subspaceTag, this._spaceId, { queueId: this._queueId });
      TRACE_QUEUE_LOAD && log.info('items fetched', { refreshId: thisRefreshId, count: objects.length });
      if (thisRefreshId !== this._refreshId) {
        return;
      }

      const decodedObjects = await Promise.all(
        objects.map((obj) =>
          Obj.fromJSON(obj, {
            refResolver: this._refResolver,
            dxn: this._dxn.extend([(obj as any).id]),
          }),
        ),
      );

      if (thisRefreshId !== this._refreshId) {
        return;
      }

      for (const obj of decodedObjects) {
        this._objectCache.set(obj.id, obj as T);
      }

      changed = objectSetChanged(this._objects, decodedObjects);

      TRACE_QUEUE_LOAD && log.info('queue refresh', { changed, objects: objects.length, refreshId: thisRefreshId });
      this._objects = decodedObjects as T[];
    } catch (err) {
      log.catch(err);
      this._error = err as Error;
    } finally {
      this._isLoading = false;
      if (changed) {
        this._signal.notifyWrite();
        this.updated.emit();
      }
    }
  });

  private readonly _subspaceTag: string;
  private readonly _spaceId: SpaceId;
  private readonly _queueId: string;

  /**
   * Number of active polling handlers.
   */
  private _pollingHandlers: number = 0;

  private _objectCache = new Map<ObjectId, T>();
  private _objects: T[] = [];
  private _isLoading = true;
  private _error: Error | null = null;
  private _refreshId = 0;
  private _querying = false;

  constructor(
    private readonly _service: QueueService,
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
   * @deprecated Use `query` method instead.
   */
  get isLoading(): boolean {
    this._signal.notifyRead();
    return this._isLoading;
  }

  /**
   * @deprecated Use `query` method instead.
   */
  get error(): Error | null {
    this._signal.notifyRead();
    return this._error;
  }

  /**
   * @deprecated Use `query` method instead.
   */
  get objects(): T[] {
    this._signal.notifyRead();
    return this.getObjectsSync();
  }

  get refResolver(): Ref.Resolver {
    return this._refResolver;
  }

  /**
   * Insert into queue with optimistic update.
   */
  async append(items: T[]): Promise<void> {
    items.forEach((item) => assertObjectModelShape(item));

    for (const item of items) {
      setRefResolverOnData(item, this._refResolver);
      defineHiddenProperty(item, SelfDXNId, this._dxn.extend([item.id]));
    }

    // Optimistic update.
    this._objects = [...this._objects, ...items];
    for (const item of items) {
      this._objectCache.set(item.id, item as T);
    }
    this._signal.notifyWrite();
    this.updated.emit();

    const json = items.map((item) => Obj.toJSON(item));

    try {
      for (let i = 0; i < json.length; i += QUEUE_APPEND_BATCH_SIZE) {
        await this._service.insertIntoQueue(
          this._subspaceTag,
          this._spaceId,
          this._queueId,
          json.slice(i, i + QUEUE_APPEND_BATCH_SIZE),
        );
      }
    } catch (err) {
      log.catch(err);
      this._error = err as Error;
      this._signal.notifyWrite();
      this.updated.emit();
    }
  }

  async delete(ids: string[]): Promise<void> {
    // Optimistic update.
    // TODO(dmaretskyi): Restrict types.
    this._objects = this._objects.filter((item) => !ids.includes((item as HasId).id));
    for (const id of ids) {
      this._objectCache.delete(id);
    }
    this._signal.notifyWrite();
    this.updated.emit();

    try {
      await this._service.deleteFromQueue(this._subspaceTag, this._spaceId, this._queueId, ids);
    } catch (err) {
      this._error = err as Error;
      this._signal.notifyWrite();
      this.updated.emit();
    }
  }

  // Odd way to define method's types from a typedef.
  declare query: Database.QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(queryOrFilter: Query.Any | Filter.Any, options?: Database.QueryOptions) {
    assertArgument(options === undefined, 'options', 'not supported');
    queryOrFilter = Filter.is(queryOrFilter) ? Query.select(queryOrFilter) : queryOrFilter;
    return new QueryResult(new QueueQueryContext(this), queryOrFilter);
  }

  /**
   * @deprecated Use `query` method instead.
   */
  async queryObjects(): Promise<T[]> {
    const objects = await this.fetchObjectsJSON();
    const decodedObjects = await Promise.all(
      objects.map(async (obj) => {
        const decoded = await Obj.fromJSON(obj, {
          refResolver: this._refResolver,
          dxn: this._dxn.extend([(obj as any).id]),
        });
        this._objectCache.set(decoded.id, decoded as T);
        return decoded;
      }),
    );

    return decodedObjects as T[];
  }

  async fetchObjectsJSON(): Promise<ObjectJSON[]> {
    const { objects } = await this._service.queryQueue(this._subspaceTag, this._spaceId, { queueId: this._queueId });
    return objects as ObjectJSON[];
  }

  async hydrateObject(obj: ObjectJSON): Promise<Obj.Any | Relation.Any> {
    const decoded = await Obj.fromJSON(obj, {
      refResolver: this._refResolver,
      dxn: this._dxn.extend([(obj as any).id]),
    });
    return decoded;
  }

  /**
   * Internal use.
   * Doesn't trigger signals.
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

  private _pollingInterval: NodeJS.Timeout | null = null;

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
}

const objectSetChanged = (before: (Obj.Any | Relation.Any)[], after: (Obj.Any | Relation.Any)[]) => {
  if (before.length !== after.length) {
    return true;
  }

  // TODO(dmaretskyi):  We might want to compare the objects data.
  return before.some((item, index) => item.id !== after[index].id);
};
