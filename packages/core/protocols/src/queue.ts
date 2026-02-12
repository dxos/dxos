//
// Copyright 2026 DXOS.org
//

export {
  type QueueQuery,
  type QueueQueryResult,
  type QueueQueryResult as QueryResult,
  type QueryQueueRequest,
  type InsertIntoQueueRequest,
  type DeleteFromQueueRequest,
} from './buf/proto/gen/dxos/client/queue_pb.ts';

// Re-export QueueService as a handler type for backwards compatibility.
export { type QueueService } from './Echo.ts';

export const KEY_QUEUE_POSITION = 'dxos.org/key/queue-position';
