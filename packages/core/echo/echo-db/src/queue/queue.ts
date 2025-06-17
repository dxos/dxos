//
// Copyright 2025 DXOS.org
//

import { type AnyEchoObject, type HasId, getTypename } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { assertArgument, failedInvariant } from '@dxos/invariant';
import { type DXN, type SpaceId } from '@dxos/keys';

import type { QueuesService } from './queue-service';
import type { Queue } from './types';

/**
 * Client-side view onto an EDGE queue.
 */
export class QueueImpl<T extends AnyEchoObject = AnyEchoObject> implements Queue<T> {
  private readonly _signal = compositeRuntime.createSignal();

  private readonly _subspaceTag: string;
  private readonly _spaceId: SpaceId;
  private readonly _queueId: string;

  private _objects: T[] = [];
  private _isLoading = true;
  private _error: Error | null = null;
  private _refreshId = 0;

  constructor(
    private readonly _service: QueuesService,
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
    assertArgument(
      items.every((item) => item.id !== undefined && !!getTypename(item)),
      'items must be valid echo objects',
    );

    // Optimistic update.
    this._objects = [...this._objects, ...items];
    this._signal.notifyWrite();

    try {
      await this._service.insertIntoQueue(this._subspaceTag, this._spaceId, this._queueId, items);
    } catch (err) {
      this._error = err as Error;
      this._signal.notifyWrite();
    }
  }

  async delete(ids: string[]): Promise<void> {
    // Optimistic update.
    // TODO(dmaretskyi): Restrict types.
    this._objects = this._objects.filter((item) => !ids.includes((item as HasId).id));
    this._signal.notifyWrite();

    try {
      await this._service.deleteFromQueue(this._subspaceTag, this._spaceId, this._queueId, ids);
    } catch (err) {
      this._error = err as Error;
      this._signal.notifyWrite();
    }
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
      const { objects } = await this._service.queryQueue(this._subspaceTag, this._spaceId, { queueId: this._queueId });
      if (thisRefreshId !== this._refreshId) {
        return;
      }

      changed = objectSetChanged(this._objects, objects as AnyEchoObject[]);

      this._objects = objects as T[];
    } catch (err) {
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
