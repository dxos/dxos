//
// Copyright 2025 DXOS.org
//

import { ATTR_META, type ObjectJSON } from '@dxos/echo/internal';
import type { EdgeHttpClient } from '@dxos/edge-client';
import type { ObjectId, SpaceId } from '@dxos/keys';
import { KEY_QUEUE_POSITION, type QueryResult, type QueueQuery, type QueueService } from '@dxos/protocols';
import { ComplexMap } from '@dxos/util';
import { FeedStore, type Block } from '@dxos/feed';
import { RuntimeProvider } from '@dxos/effect';
import { Effect } from 'effect';
import type * as SqlClient from '@effect/sql/SqlClient';

/**
 * Writes queue data to a local FeedStore.
 */
// subspaceTag -> namespace
// its okay if query is not fully supported
// Objects are ObjectJSON instances, they should be serialized to JSON using standard method and stored in the data field
// deletion should be implemented by writing a tombstone object -> { id: ..., "@deleted": true, }

export class LocalQueueServiceImpl implements QueueService {
  #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  #feedStore: FeedStore;

  constructor(runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>, feedStore: FeedStore) {
    this.#runtime = runtime;
    this.#feedStore = feedStore;
  }

  queryQueue(subspaceTag: string, spaceId: SpaceId, query: QueueQuery): Promise<QueryResult> {
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const result = yield* this.#feedStore.query({
          requestId: 'req', // TODO(dmaretskyi): Request Id.
          spaceId: spaceId,
          query: { feedIds: [query.queueId.toString()] },
          cursor: -1, // TODO(dmaretskyi): Cursor.s.
        });

        const objects = result.blocks.map((block: Block) => {
          const data = JSON.parse(new TextDecoder().decode(block.data));
          return data;
        });

        return {
          objects,
          nextCursor: null,
          prevCursor: null,
        };
      }),
    );
  }

  insertIntoQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objects: unknown[]): Promise<void> {
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const messages = objects.map((obj) => ({
          spaceId: spaceId,
          feedId: queueId,
          feedNamespace: subspaceTag,
          data: new TextEncoder().encode(JSON.stringify(obj)),
        }));

        yield* this.#feedStore.appendLocal(messages);
      }),
    );
  }

  deleteFromQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objectIds: ObjectId[]): Promise<void> {
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        const messages = objectIds.map((id) => ({
          spaceId: spaceId,
          feedId: queueId,
          feedNamespace: subspaceTag,
          data: new TextEncoder().encode(JSON.stringify({ id, '@deleted': true })),
        }));

        yield* this.#feedStore.appendLocal(messages);
      }),
    );
  }
}

/**
 * Backed by Edge.
 */
export class QueueServiceImpl implements QueueService {
  constructor(private readonly _client: EdgeHttpClient) {}

  queryQueue(subspaceTag: string, spaceId: SpaceId, query: QueueQuery): Promise<QueryResult> {
    return this._client.queryQueue(subspaceTag, spaceId, query);
  }

  insertIntoQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objects: unknown[]): Promise<void> {
    return this._client.insertIntoQueue(subspaceTag, spaceId, queueId, objects);
  }

  deleteFromQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objectIds: ObjectId[]): Promise<void> {
    return this._client.deleteFromQueue(subspaceTag, spaceId, queueId, objectIds);
  }
}

/**
 * Stub implementation for when Edge is not available.
 */
export class QueueServiceStub implements QueueService {
  queryQueue(subspaceTag: string, spaceId: SpaceId, query: QueueQuery): Promise<QueryResult> {
    throw new Error('Not available.');
  }

  insertIntoQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objects: unknown[]): Promise<void> {
    throw new Error('Not available.');
  }

  deleteFromQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objectIds: ObjectId[]): Promise<void> {
    throw new Error('Not available.');
  }
}

/**
 * Mock implementation for testing.
 */
export class MockQueueService implements QueueService {
  private _queues = new ComplexMap<[subspaceTag: string, spaceId: SpaceId, queueId: ObjectId], unknown[]>(
    ([subspaceTag, spaceId, queueId]) => `${subspaceTag}:${spaceId}:${queueId}`,
  );

  async queryQueue(subspaceTag: string, spaceId: SpaceId, query: QueueQuery): Promise<QueryResult> {
    const objects = this._queues.get([subspaceTag, spaceId, query.queueId]) ?? [];
    return {
      objects,
      nextCursor: null,
      prevCursor: null,
    };
  }

  async insertIntoQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objects: unknown[]): Promise<void> {
    const key: [string, SpaceId, ObjectId] = [subspaceTag, spaceId, queueId];
    const array = this._queues.get(key) ?? [];
    this._queues.set(key, array);
    for (const obj of objects) {
      setQueuePosition(obj as ObjectJSON, array.length);
      array.push(obj);
    }
  }

  async deleteFromQueue(
    subspaceTag: string,
    spaceId: SpaceId,
    queueId: ObjectId,
    objectIds: ObjectId[],
  ): Promise<void> {
    const key: [string, SpaceId, ObjectId] = [subspaceTag, spaceId, queueId];
    const existing = this._queues.get(key) ?? [];
    this._queues.set(
      key,
      existing.filter((obj: any) => !objectIds.includes(obj.id)),
    );
  }
}

const setQueuePosition = (obj: ObjectJSON, position: number) => {
  obj[ATTR_META] ??= { keys: [] };
  obj[ATTR_META].keys ??= [];
  for (let i = 0; i < obj[ATTR_META].keys.length; i++) {
    const key = obj[ATTR_META].keys[i];
    if (key.source === KEY_QUEUE_POSITION) {
      obj[ATTR_META].keys.splice(i, 1);
      i--;
    }
  }
  obj[ATTR_META].keys.push({
    source: KEY_QUEUE_POSITION,
    id: position.toString(),
  });
};
