//
// Copyright 2025 DXOS.org
//

import type { ObjectId } from '@dxos/echo/internal';
import type { EdgeHttpClient } from '@dxos/edge-client';
import type { SpaceId } from '@dxos/keys';
import type { QueryResult, QueueQuery } from '@dxos/protocols';
import { ComplexMap } from '@dxos/util';

/**
 * Service for managing queues.
 */
// TODO(burdon): Base type for all services?
export interface QueueService {
  queryQueue(subspaceTag: string, spaceId: SpaceId, query: QueueQuery): Promise<QueryResult>;

  insertIntoQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objects: unknown[]): Promise<void>;

  deleteFromQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objectIds: ObjectId[]): Promise<void>;
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
    const existing = this._queues.get(key) ?? [];
    this._queues.set(key, [...existing, ...objects]);
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
