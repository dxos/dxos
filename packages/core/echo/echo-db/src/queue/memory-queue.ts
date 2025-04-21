//
// Copyright 2025 DXOS.org
//

import { type BaseEchoObject, ObjectId, type HasId } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { DXN, SpaceId } from '@dxos/keys';

import { type Queue } from './types';

export type MemoryQueueOptions<T extends BaseEchoObject = BaseEchoObject> = {
  spaceId?: SpaceId;
  queueId?: string;
  dxn?: DXN;
  items?: T[];
};

/**
 * In-memory queue.
 */
export class MemoryQueue<T extends BaseEchoObject = BaseEchoObject> implements Queue<T> {
  static make<T extends BaseEchoObject = BaseEchoObject>({
    spaceId,
    queueId,
    dxn,
    items,
  }: MemoryQueueOptions<T>): MemoryQueue<T> {
    if (!dxn) {
      dxn = new DXN(DXN.kind.QUEUE, [spaceId ?? SpaceId.random(), queueId ?? ObjectId.random()]);
    } else {
      invariant(spaceId == null && queueId == null);
    }

    const queue = new MemoryQueue<T>(dxn);
    if (items) {
      void queue.append(items);
    }
    return queue;
  }

  private readonly _signal = compositeRuntime.createSignal();

  private _items: T[] = [];

  constructor(private readonly _dxn: DXN) {}

  get dxn() {
    return this._dxn;
  }

  get items(): T[] {
    this._signal.notifyRead();
    return [...this._items];
  }

  get isLoading(): boolean {
    return false;
  }

  get error(): Error | null {
    return null;
  }

  /**
   * Insert into queue with optimistic update.
   */
  async append(items: T[]): Promise<void> {
    this._items = [...this._items, ...items];
    this._signal.notifyWrite();
  }

  delete(ids: ObjectId[]): void {
    // TODO(dmaretskyi): Restrict types.
    this._items = this._items.filter((item) => !ids.includes((item as HasId).id));
    this._signal.notifyWrite();
  }

  async refresh(): Promise<void> {
    // No-op.
  }
}
