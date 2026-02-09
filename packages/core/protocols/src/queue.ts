//
// Copyright 2026 DXOS.org
//

export {
  type QueueService,
  type QueueQuery,
  type QueueQueryResult as QueryResult,
  type QueryQueueRequest,
  type InsertIntoQueueRequest,
  type DeleteFromQueueRequest,
} from './proto/gen/dxos/client/services.ts';

export const KEY_QUEUE_POSITION = 'dxos.org/key/queue-position';
