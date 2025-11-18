//
// Copyright 2025 DXOS.org
//

import type { ObjectId } from './types.js';
import type { SpaceId } from '@dxos/keys';

export type QueueCursor = string & { __QueueCursor: never };

export type QueueQuery = {
  queueId: ObjectId;

  after?: QueueCursor;
  before?: QueueCursor;
  limit?: number;
  reverse?: boolean;
  objectIds?: ObjectId[];
};

// TODO(dmaretskyi): Rename QueueQueryResult.
export type QueryResult = {
  // TODO(dmaretskyi): HasId & HasTypename.

  objects: unknown[];

  /**
   * Cursor at the end of the range.
   */
  nextCursor: QueueCursor | null;
  /**
   * Cursor at the start of the range.
   */
  prevCursor: QueueCursor | null;
};

/**
 * Position of an object in the queue that it is in.
 */
export const KEY_QUEUE_POSITION = 'dxos.org/key/queue-position';

/**
 * Service for managing queues.
 */
export interface QueueService {
  queryQueue(subspaceTag: string, spaceId: SpaceId, query: QueueQuery): Promise<QueryResult>;

  insertIntoQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objects: unknown[]): Promise<void>;

  deleteFromQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objectIds: ObjectId[]): Promise<void>;
}
