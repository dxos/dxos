//
// Copyright 2025 DXOS.org
//

import { type Echo } from '@dxos/protocols';
import { EMPTY } from '@dxos/protocols/buf';
import type {
  DeleteFromQueueRequest,
  InsertIntoQueueRequest,
  QueryQueueRequest,
  QueueQueryResult,
} from '@dxos/protocols/buf/dxos/client/queue_pb';

/**
 * Stub implementation for when Edge is not available.
 */
export class QueueServiceStub implements Echo.QueueService {
  queryQueue(request: QueryQueueRequest): Promise<QueueQueryResult> {
    throw new Error('Not available.');
  }

  insertIntoQueue(request: InsertIntoQueueRequest) {
    throw new Error('Not available.');
    return Promise.resolve(EMPTY);
  }

  deleteFromQueue(request: DeleteFromQueueRequest) {
    throw new Error('Not available.');
    return Promise.resolve(EMPTY);
  }
}
