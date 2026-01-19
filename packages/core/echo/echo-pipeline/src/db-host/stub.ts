//
// Copyright 2025 DXOS.org
//

import type {
  DeleteFromQueueRequest,
  InsertIntoQueueRequest,
  QueryQueueRequest,
  QueueQueryResult,
  QueueService,
} from '@dxos/protocols/proto/dxos/client/services';

/**
 * Stub implementation for when Edge is not available.
 */
export class QueueServiceStub implements QueueService {
  queryQueue(request: QueryQueueRequest): Promise<QueueQueryResult> {
    throw new Error('Not available.');
  }

  insertIntoQueue(request: InsertIntoQueueRequest): Promise<void> {
    throw new Error('Not available.');
  }

  deleteFromQueue(request: DeleteFromQueueRequest): Promise<void> {
    throw new Error('Not available.');
  }
}
