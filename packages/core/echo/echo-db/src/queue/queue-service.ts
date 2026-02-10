//
// Copyright 2025 DXOS.org
//

import { ATTR_META, type ObjectJSON } from '@dxos/echo/internal';
import type { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import type { ObjectId, SpaceId } from '@dxos/keys';
import { type Echo, KEY_QUEUE_POSITION } from '@dxos/protocols';
import { create, EmptySchema, type Empty, type JsonObject } from '@dxos/protocols/buf';
import {
  type DeleteFromQueueRequest,
  type InsertIntoQueueRequest,
  type QueryQueueRequest,
  type QueueQueryResult,
  QueueQueryResultSchema,
} from '@dxos/protocols/buf/dxos/client/queue_pb';
import { ComplexMap } from '@dxos/util';

/**
 * Backed by Edge.
 */
export class QueueServiceImpl implements Echo.QueueService {
  constructor(private readonly _client: EdgeHttpClient) {}

  async queryQueue(request: QueryQueueRequest): Promise<QueueQueryResult> {
    invariant(request.query?.queuesNamespace);
    const result = await this._client.queryQueue(
      request.query.queuesNamespace,
      request.query.spaceId as SpaceId,
      request.query,
    );
    return result;
  }

  async insertIntoQueue(request: InsertIntoQueueRequest): Promise<Empty> {
    await this._client.insertIntoQueue(
      request.subspaceTag,
      request.spaceId as SpaceId,
      request.queueId as ObjectId,
      request.objects,
    );
    return create(EmptySchema);
  }

  async deleteFromQueue(request: DeleteFromQueueRequest): Promise<Empty> {
    await this._client.deleteFromQueue(
      request.subspaceTag!,
      request.spaceId as SpaceId,
      request.queueId as ObjectId,
      request.objectIds as ObjectId[],
    );
    return create(EmptySchema);
  }
}

/**
 * Mock implementation for testing.
 */
export class MockQueueService implements Echo.QueueService {
  private _queues = new ComplexMap<[subspaceTag: string, spaceId: SpaceId, queueId: ObjectId], JsonObject[]>(
    ([subspaceTag, spaceId, queueId]) => `${subspaceTag}:${spaceId}:${queueId}`,
  );

  async queryQueue(request: QueryQueueRequest): Promise<QueueQueryResult> {
    const { query } = request;
    const objects =
      this._queues.get([request.query!.queuesNamespace!, query!.spaceId as SpaceId, query!.queueIds![0] as ObjectId]) ??
      [];
    return create(QueueQueryResultSchema, {
      objects,
      nextCursor: '',
      prevCursor: '',
    });
  }

  async insertIntoQueue(request: InsertIntoQueueRequest): Promise<Empty> {
    const { subspaceTag, spaceId, queueId, objects } = request;
    const key: [string, SpaceId, ObjectId] = [subspaceTag, spaceId as SpaceId, queueId as ObjectId];
    const array = this._queues.get(key) ?? [];
    this._queues.set(key, array);
    for (const obj of objects) {
      setQueuePosition(obj as ObjectJSON, array.length);
      array.push(obj);
    }
    return create(EmptySchema);
  }

  async deleteFromQueue(request: DeleteFromQueueRequest): Promise<Empty> {
    const { subspaceTag, spaceId, queueId, objectIds } = request;
    const key: [string, SpaceId, ObjectId] = [subspaceTag, spaceId as SpaceId, queueId as ObjectId];
    const existing = this._queues.get(key) ?? [];
    this._queues.set(
      key,
      existing.filter((obj) => !objectIds.includes((obj as { id?: string }).id ?? '')),
    );
    return create(EmptySchema);
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
