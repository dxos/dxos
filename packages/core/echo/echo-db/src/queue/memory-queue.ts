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
  objects?: T[];
};

/**
 * In-memory queue.
 */
export class MemoryQueue<T extends BaseEchoObject = BaseEchoObject> implements Queue<T> {
  static make<T extends BaseEchoObject = BaseEchoObject>({
    spaceId,
    queueId,
    dxn,
    objects,
  }: MemoryQueueOptions<T>): MemoryQueue<T> {
    if (!dxn) {
      dxn = new DXN(DXN.kind.QUEUE, [spaceId ?? SpaceId.random(), queueId ?? ObjectId.random()]);
    } else {
      invariant(spaceId == null && queueId == null);
    }

    const queue = new MemoryQueue<T>(dxn);
    if (objects?.length) {
      void queue.append(objects);
    }

    return queue;
  }

  private readonly _signal = compositeRuntime.createSignal();

  private _objects: T[] = [];

  constructor(private readonly _dxn: DXN) {}

  get dxn() {
    return this._dxn;
  }

  get isLoading(): boolean {
    return false;
  }

  get error(): Error | null {
    return null;
  }

  get objects(): T[] {
    this._signal.notifyRead();
    return [...this._objects];
  }

  /**
   * Insert into queue with optimistic update.
   */
  async append(objects: T[]): Promise<void> {
    this._objects = [...this._objects, ...objects];
    this._signal.notifyWrite();
  }

  delete(ids: ObjectId[]): void {
    // TODO(dmaretskyi): Restrict types.
    this._objects = this._objects.filter((object) => !ids.includes((object as HasId).id));
    this._signal.notifyWrite();
  }

  async refresh(): Promise<void> {
    // No-op.
  }
}
