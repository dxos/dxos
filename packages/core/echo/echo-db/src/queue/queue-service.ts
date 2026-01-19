//
// Copyright 2025 DXOS.org
//

import { ATTR_META, type ObjectJSON } from '@dxos/echo/internal';
import type { EdgeHttpClient } from '@dxos/edge-client';
import type { ObjectId, SpaceId } from '@dxos/keys';
import { KEY_QUEUE_POSITION } from '@dxos/protocols';
import type {
  QueryQueueRequest,
  InsertIntoQueueRequest,
  DeleteFromQueueRequest,
  QueueQueryResult,
  QueueService,
} from '@dxos/protocols/proto/dxos/client/services';
import { ComplexMap } from '@dxos/util';

/**
 * Backed by Edge.
 */
export class QueueServiceImpl implements QueueService {
  constructor(private readonly _client: EdgeHttpClient) {}

  async queryQueue(request: QueryQueueRequest): Promise<QueueQueryResult> {
    const result = await this._client.queryQueue(request.subspaceTag!, request.spaceId as SpaceId, request.query!);
    return result as any as QueueQueryResult;
  }

  insertIntoQueue(request: InsertIntoQueueRequest): Promise<void> {
    return this._client.insertIntoQueue(
      request.subspaceTag!,
      request.spaceId as SpaceId,
      request.queueId as ObjectId,
      request.objects!,
    );
  }

  deleteFromQueue(request: DeleteFromQueueRequest): Promise<void> {
    return this._client.deleteFromQueue(
      request.subspaceTag!,
      request.spaceId as SpaceId,
      request.queueId as ObjectId,
      request.objectIds as ObjectId[],
    );
  }
}

/**
 * Mock implementation for testing.
 */
export class MockQueueService implements QueueService {
  private _queues = new ComplexMap<[subspaceTag: string, spaceId: SpaceId, queueId: ObjectId], unknown[]>(
    ([subspaceTag, spaceId, queueId]) => `${subspaceTag}:${spaceId}:${queueId}`,
  );

  async queryQueue(request: QueryQueueRequest): Promise<QueueQueryResult> {
    const { subspaceTag, spaceId, query } = request;
    const objects = this._queues.get([subspaceTag!, spaceId as SpaceId, query!.queueId as ObjectId]) ?? [];
    return {
      objects: objects as any,
      nextCursor: '',
      prevCursor: '',
    };
  }

  async insertIntoQueue(request: InsertIntoQueueRequest): Promise<void> {
    const { subspaceTag, spaceId, queueId, objects } = request;
    const key: [string, SpaceId, ObjectId] = [subspaceTag!, spaceId as SpaceId, queueId as ObjectId];
    const array = this._queues.get(key) ?? [];
    this._queues.set(key, array);
    for (const obj of objects!) {
      setQueuePosition(obj as ObjectJSON, array.length);
      array.push(obj);
    }
  }

  async deleteFromQueue(request: DeleteFromQueueRequest): Promise<void> {
    const { subspaceTag, spaceId, queueId, objectIds } = request;
    const key: [string, SpaceId, ObjectId] = [subspaceTag!, spaceId as SpaceId, queueId as ObjectId];
    const existing = this._queues.get(key) ?? [];
    this._queues.set(
      key,
      existing.filter((obj: any) => !objectIds!.includes(obj.id)),
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
