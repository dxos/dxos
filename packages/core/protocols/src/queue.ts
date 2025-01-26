import type { ObjectId } from './types.js';

export type QueueCursor = string & { __QueueCursor: never };

export type QueueQuery = {
  queueId: ObjectId;

  after?: QueueCursor;
  before?: QueueCursor;
  limit?: number;
  reverse?: boolean;
  objectIds?: ObjectId[];
};

export type QueryResult = {
  objects: unknown[];
  // /**
  //  * Cursor at the end of the range.
  //  */
  nextCursor: QueueCursor | null;
  // /**
  //  * Cursor at the start of the range.
  //  */
  prevCursor: QueueCursor | null;
};
