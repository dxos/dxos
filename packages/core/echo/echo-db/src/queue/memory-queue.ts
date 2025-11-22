//
// Copyright 2025 DXOS.org
//

import { type Obj, type Relation } from '@dxos/echo';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { DXN, ObjectId, SpaceId } from '@dxos/keys';

import { type Queue } from './types';

export type MemoryQueueOptions<T extends Obj.Any | Relation.Any> = {
  spaceId?: SpaceId;
  queueId?: string;
  dxn?: DXN;
  objects?: T[];
};

/**
 * In-memory queue.
 * @deprecated Use the actual queue with a mock service.
 */
export class MemoryQueue<T extends Obj.Any | Relation.Any> implements Queue<T> {
  static make<T extends Obj.Any | Relation.Any>({
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

  toJSON() {
    return {
      dxn: this._dxn.toString(),
      objects: this._objects.length,
    };
  }

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

  query(): never {
    throw new Error('Method not implemented.');
  }

  /**
   * Insert into queue with optimistic update.
   */
  async append(objects: T[]): Promise<void> {
    this._objects = [...this._objects, ...objects];
    this._signal.notifyWrite();
  }

  async queryObjects(): Promise<T[]> {
    return this._objects;
  }

  async getObjectsById(ids: ObjectId[]): Promise<(T | undefined)[]> {
    return ids.map((id) => this._objects.find((object) => object.id === id));
  }

  async delete(ids: ObjectId[]): Promise<void> {
    // TODO(dmaretskyi): Restrict types.
    this._objects = this._objects.filter((object) => !ids.includes(object.id));
    this._signal.notifyWrite();
  }

  async refresh(): Promise<void> {
    // No-op.
  }
}
