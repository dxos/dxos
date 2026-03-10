//
// Copyright 2025 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Entity } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN, ObjectId, SpaceId } from '@dxos/keys';

import { type Queue } from './types';

export type MemoryQueueOptions<T extends Entity.Unknown> = {
  spaceId?: SpaceId;
  queueId?: string;
  dxn?: DXN;
  objects?: T[];
};

/**
 * In-memory queue.
 * @deprecated Use the actual queue with a mock service.
 */
export class MemoryQueue<T extends Entity.Unknown> implements Queue<T> {
  static make<T extends Entity.Unknown>({ spaceId, queueId, dxn, objects }: MemoryQueueOptions<T>): MemoryQueue<T> {
    if (!dxn) {
      dxn = new DXN(DXN.kind.QUEUE, [spaceId ?? SpaceId.random(), queueId ?? ObjectId.random()]);
    } else {
      invariant(spaceId == null && queueId == null);
    }

    const queue = new MemoryQueue<T>(dxn);
    if (objects?.length) {
      void queue.append(Context.default(), objects);
    }

    return queue;
  }

  public readonly updated = new Event();

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

  subscribe(ctx: Context, callback: () => void): () => void {
    return this.updated.on(callback);
  }

  get isLoading(): boolean {
    return false;
  }

  get error(): Error | null {
    return null;
  }

  get objects(): T[] {
    return [...this._objects];
  }

  query(ctx: Context): never {
    throw new Error('Method not implemented.');
  }

  async sync(ctx: Context): Promise<void> {
    // No-op.
  }

  /**
   * Insert into queue with optimistic update.
   */
  async append(ctx: Context, objects: T[]): Promise<void> {
    this._objects = [...this._objects, ...objects];
    this.updated.emit();
  }

  async queryObjects(ctx: Context): Promise<T[]> {
    return this._objects;
  }

  async getObjectsById(ctx: Context, ids: ObjectId[]): Promise<(T | undefined)[]> {
    return ids.map((id) => this._objects.find((object) => object.id === id));
  }

  async delete(ctx: Context, ids: ObjectId[]): Promise<void> {
    // TODO(dmaretskyi): Restrict types.
    this._objects = this._objects.filter((object) => !ids.includes(object.id));
    this.updated.emit();
  }

  async refresh(ctx: Context): Promise<void> {
    // No-op.
  }
}
