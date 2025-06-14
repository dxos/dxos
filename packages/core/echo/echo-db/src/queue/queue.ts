//
// Copyright 2025 DXOS.org
//

import { getTypename, type BaseEchoObject, type HasId } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { assertArgument, failedInvariant } from '@dxos/invariant';
import { type DXN, type SpaceId } from '@dxos/keys';

import type { QueuesService } from './queue-service';
import type { Queue } from './types';

/**
 * Client-side view onto an EDGE queue.
 */
// TODO(burdon): Move to echo-queue.
// TODO(burdon): T should be constrained to EchoObject.
export class QueueImpl<T extends BaseEchoObject = BaseEchoObject> implements Queue<T> {
  private readonly _signal = compositeRuntime.createSignal();

  private readonly _subspaceTag: string;
  private readonly _spaceId: SpaceId;
  private readonly _queueId: string;

  private _items: T[] = [];
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

  get dxn() {
    return this._dxn;
  }

  get items(): T[] {
    this._signal.notifyRead();
    return this._items;
  }

  get isLoading(): boolean {
    this._signal.notifyRead();
    return this._isLoading;
  }

  get error(): Error | null {
    this._signal.notifyRead();
    return this._error;
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
    this._items = [...this._items, ...items];
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
    this._items = this._items.filter((item) => !ids.includes((item as HasId).id));
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
    try {
      const { objects } = await this._service.queryQueue(this._subspaceTag, this._spaceId, { queueId: this._queueId });
      if (thisRefreshId !== this._refreshId) {
        return;
      }

      this._items = objects as T[];
    } catch (err) {
      this._error = err as Error;
    } finally {
      this._isLoading = false;
      this._signal.notifyWrite();
    }
  }
}
