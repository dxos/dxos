//
// Copyright 2025 DXOS.org
//

import { Event } from '@dxos/async';
import { type Entity } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID, EntityId, SpaceId } from '@dxos/keys';

export type MemoryQueueOptions<T extends Entity.Unknown> = {
  spaceId?: SpaceId;
  queueId?: EntityId;
  uri?: EID.EID;
  objects?: T[];
};

/**
 * @deprecated Use the actual queue with a mock service.
 */
export class MemoryQueue<T extends Entity.Unknown> {
  static make<T extends Entity.Unknown>({ spaceId, queueId, uri, objects }: MemoryQueueOptions<T>): MemoryQueue<T> {
    if (!uri) {
      uri = EID.make({ spaceId: spaceId ?? SpaceId.random(), entityId: queueId ?? EntityId.random() });
    } else {
      invariant(spaceId == null && queueId == null);
    }

    const queue = new MemoryQueue<T>(uri);
    if (objects?.length) {
      void queue.append(objects);
    }

    return queue;
  }

  public readonly updated = new Event();

  private _objects: T[] = [];

  constructor(private readonly _uri: EID.EID) {}

  toJSON() {
    return {
      uri: this._uri,
      objects: this._objects.length,
    };
  }

  get uri(): EID.EID {
    return this._uri;
  }

  subscribe(callback: () => void): () => void {
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

  async sync(): Promise<void> {
    // No-op.
  }

  /**
   * Insert into queue with optimistic update.
   */
  async append(objects: T[]): Promise<void> {
    this._objects = [...this._objects, ...objects];
    this.updated.emit();
  }

  async queryObjects(): Promise<T[]> {
    return this._objects;
  }

  async getObjectsById(ids: EntityId[]): Promise<(T | undefined)[]> {
    return ids.map((id) => this._objects.find((object) => object.id === id));
  }

  async delete(ids: EntityId[]): Promise<void> {
    // TODO(dmaretskyi): Restrict types.
    this._objects = this._objects.filter((object) => !ids.includes(object.id));
    this.updated.emit();
  }

  async refresh(): Promise<void> {
    // No-op.
  }
}
