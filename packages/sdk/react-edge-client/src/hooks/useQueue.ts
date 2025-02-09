//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useRef, useState } from 'react';

import { type EdgeHttpClient } from '@dxos/edge-client';
import { type DXN, type SpaceId } from '@dxos/keys';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { failedInvariant, invariant } from '@dxos/invariant';

export type UseQueueOptions = {
  pollInterval?: number;
};

/**
 * Client-side view onto an EDGE queue.
 */
export type Queue<T> = {
  items: T[];
  isLoading: boolean;
  error: Error | null;
  append(items: T[]): void;
};

/**
 * Client-side view onto an EDGE queue.
 */
// TODO(dmaretskyi): Move to echo.
class QueueImpl<T> implements Queue<T> {
  private readonly _subspaceTag: string;
  private readonly _spaceId: SpaceId;
  private readonly _queueId: string;

  private readonly _signal = compositeRuntime.createSignal();

  private _items: T[] = [];
  private _isLoading = true;
  private _error: Error | null = null;
  private _refreshId = 0;

  constructor(
    private readonly _client: EdgeHttpClient,
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
    // Optimistic update.
    this._items = [...this._items, ...items];
    this._signal.notifyWrite();

    try {
      await this._client.insertIntoQueue(this._subspaceTag, this._spaceId, this._queueId, items);
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
  async refresh() {
    const thisRefreshId = ++this._refreshId;
    try {
      const { objects } = await this._client.queryQueue(this._subspaceTag, this._spaceId, { queueId: this._queueId });
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

/**
 * Polls the given Edge queue.
 */
// TODO(burdon): Replace polling with socket?
export const useQueue = <T>(
  client: EdgeHttpClient,
  queueDxn?: DXN,
  options: UseQueueOptions = {},
): Queue<T> | undefined => {
  const queue = useMemo<QueueImpl<T> | undefined>(
    () => (queueDxn ? new QueueImpl(client, queueDxn) : undefined),
    [client, queueDxn?.toString()],
  );

  useEffect(() => {
    void queue?.refresh();
  }, [queue]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (options.pollInterval) {
      const poll = () => {
        void queue?.refresh().finally(() => {
          interval = setTimeout(poll, options.pollInterval);
        });
      };

      poll();
    }

    return () => clearInterval(interval);
  }, [options.pollInterval]);

  return queue;
};
