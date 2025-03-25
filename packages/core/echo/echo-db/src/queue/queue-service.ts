//
// Copyright 2025 DXOS.org
//

import type { ObjectId } from '@dxos/echo-schema';
import type { EdgeHttpClient } from '@dxos/edge-client';
import type { SpaceId } from '@dxos/keys';
import type { QueryResult, QueueQuery } from '@dxos/protocols';

/**
 * Service for managing queues.
 */
export interface QueuesService {
  queryQueue(subspaceTag: string, spaceId: SpaceId, query: QueueQuery): Promise<QueryResult>;

  insertIntoQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objects: unknown[]): Promise<void>;

  deleteFromQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objectIds: ObjectId[]): Promise<void>;
}

/**
 * Backed by Edge.
 */
export class QueueServiceImpl implements QueuesService {
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
export class QueueServiceStub implements QueuesService {
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
