//
// Copyright 2025 DXOS.org
//

import { Obj, type Ref } from '@dxos/echo';
import { type AnyEchoObject, type HasId, assertObjectModelShape, setRefResolverOnData } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { failedInvariant } from '@dxos/invariant';
import { type DXN, type ObjectId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import type { QueueService } from './queue-service';
import type { Queue } from './types';

const TRACE_QUEUE_LOAD = false;

/**
 * Client-side view onto an EDGE queue.
 */
export class QueueImpl<T extends AnyEchoObject = AnyEchoObject> implements Queue<T> {
  private readonly _signal = compositeRuntime.createSignal();

  private readonly _subspaceTag: string;
  private readonly _spaceId: SpaceId;
  private readonly _queueId: string;

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

  get isLoading(): boolean {
    this._signal.notifyRead();
    return this._isLoading;
  }

  get error(): Error | null {
    this._signal.notifyRead();
    return this._error;
  }

  get objects(): T[] {
    this._signal.notifyRead();
    return this._objects;
  }

  /**
   * Insert into queue with optimistic update.
   */
  async append(items: T[]): Promise<void> {
    items.forEach((item) => assertObjectModelShape(item));

    for (const item of items) {
      setRefResolverOnData(item, this._refResolver);
    }

    // Optimistic update.
    this._objects = [...this._objects, ...items];
    for (const item of items) {
      this._objectCache.set(item.id, item as T);
    }
    this._signal.notifyWrite();

    try {
      await this._service.insertIntoQueue(
        this._subspaceTag,
        this._spaceId,
        this._queueId,
        items.map((item) => Obj.toJSON(item)),
      );
    } catch (err) {
      log.catch(err);
      this._error = err as Error;
      this._signal.notifyWrite();
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

    try {
      await this._service.deleteFromQueue(this._subspaceTag, this._spaceId, this._queueId, ids);
    } catch (err) {
      this._error = err as Error;
      this._signal.notifyWrite();
    }
  }

  async queryObjects(): Promise<T[]> {
    const { objects } = await this._service.queryQueue(this._subspaceTag, this._spaceId, { queueId: this._queueId });
    const decodedObjects = await Promise.all(
      objects.map(async (obj) => {
        const decoded = await Obj.fromJSON(obj, { refResolver: this._refResolver });
        this._objectCache.set(decoded.id, decoded as T);
        return decoded;
      }),
    );

    return decodedObjects as T[];
  }

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
   */
  // TODO(dmaretskyi): Split optimistic into separate state so it doesn't get overridden.
  async refresh(): Promise<void> {
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
        objects.map((obj) => Obj.fromJSON(obj, { refResolver: this._refResolver })),
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
      }
    }
  }
}

const objectSetChanged = (before: AnyEchoObject[], after: AnyEchoObject[]) => {
  if (before.length !== after.length) {
    return true;
  }

  // TODO(dmaretskyi):  We might want to compare the objects data.
  return before.some((item, index) => item.id !== after[index].id);
};
