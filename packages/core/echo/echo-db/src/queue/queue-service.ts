//
// Copyright 2025 DXOS.org
//

import { Context } from '@dxos/context';
import { ATTR_META, type ObjectJSON } from '@dxos/echo/internal';
import type { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import type { ObjectId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import type {
  DeleteFromQueueRequest,
  InsertIntoQueueRequest,
  QueryQueueRequest,
  QueueQueryResult,
  QueueService,
  SyncQueueRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { ComplexMap, compositeKey } from '@dxos/util';

/**
 * Backed by Edge.
 */
export class QueueServiceImpl implements QueueService {
  constructor(private readonly _client: EdgeHttpClient) {}

  async queryQueue(request: QueryQueueRequest): Promise<QueueQueryResult> {
    invariant(request.query?.queuesNamespace);
    const ctx = Context.default();
    const result = await this._client.queryQueue(
      ctx,
      request.query.queuesNamespace,
      request.query.spaceId as SpaceId,
      request.query,
    );
    return {
      ...result,
      objects: (result.objects ?? []).map((obj) => JSON.stringify(obj)),
    } as QueueQueryResult;
  }

  insertIntoQueue(request: InsertIntoQueueRequest): Promise<void> {
    const ctx = Context.default();
    return this._client.insertIntoQueue(
      ctx,
      request.subspaceTag!,
      request.spaceId as SpaceId,
      request.queueId as ObjectId,
      (request.objects ?? []).map((encoded) => JSON.parse(encoded)),
    );
  }

  deleteFromQueue(request: DeleteFromQueueRequest): Promise<void> {
    const ctx = Context.default();
    return this._client.deleteFromQueue(
      ctx,
      request.subspaceTag!,
      request.spaceId as SpaceId,
      request.queueId as ObjectId,
      request.objectIds as ObjectId[],
    );
  }

  async syncQueue(_: SyncQueueRequest): Promise<void> {
    // no-op
  }
}

/**
 * Mock implementation for testing.
 */
export class MockQueueService implements QueueService {
  private _queues = new ComplexMap<[subspaceTag: string, spaceId: SpaceId, queueId: ObjectId], ObjectJSON[]>(
    ([subspaceTag, spaceId, queueId]) => compositeKey(subspaceTag, spaceId, queueId),
  );

  async queryQueue(request: QueryQueueRequest): Promise<QueueQueryResult> {
    const { query } = request;
    const objects =
      this._queues.get([request.query.queuesNamespace!, query!.spaceId as SpaceId, query!.queueIds![0] as ObjectId]) ??
      [];
    return {
      objects: objects.map((obj) => JSON.stringify(obj)),
      nextCursor: '',
      prevCursor: '',
    };
  }

  async insertIntoQueue(request: InsertIntoQueueRequest): Promise<void> {
    const { subspaceTag, spaceId, queueId, objects } = request;
    const key: [string, SpaceId, ObjectId] = [subspaceTag!, spaceId as SpaceId, queueId as ObjectId];
    const array = this._queues.get(key) ?? [];
    this._queues.set(key, array);
    for (const encoded of objects ?? []) {
      const obj = JSON.parse(encoded) as ObjectJSON;
      setQueuePosition(obj, array.length);
      array.push(obj);
    }
  }

  async deleteFromQueue(request: DeleteFromQueueRequest): Promise<void> {
    const { subspaceTag, spaceId, queueId, objectIds } = request;
    const key: [string, SpaceId, ObjectId] = [subspaceTag!, spaceId as SpaceId, queueId as ObjectId];
    const existing = this._queues.get(key) ?? [];
    this._queues.set(
      key,
      existing.filter((obj) => !objectIds!.includes(obj.id)),
    );
  }

  async syncQueue(_: SyncQueueRequest): Promise<void> {
    // no-op
  }
}

const setQueuePosition = (obj: ObjectJSON, position: number) => {
  obj[ATTR_META] ??= { keys: [] };
  obj[ATTR_META].keys ??= [];
  for (let i = 0; i < obj[ATTR_META].keys.length; i++) {
    const key = obj[ATTR_META].keys[i];
    if (key.source === FeedProtocol.KEY_QUEUE_POSITION) {
      obj[ATTR_META].keys.splice(i, 1);
      i--;
    }
  }
  obj[ATTR_META].keys.push({
    source: FeedProtocol.KEY_QUEUE_POSITION,
    id: position.toString(),
  });
};
