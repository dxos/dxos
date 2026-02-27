//
// Copyright 2025 DXOS.org
//

import { type Echo } from '@dxos/protocols';
import { EMPTY, type Empty } from '@dxos/protocols/buf';
import type {
  DeleteFromQueueRequest,
  InsertIntoQueueRequest,
  QueryQueueRequest,
  QueueQueryResult,
  SyncQueueRequest,
} from '@dxos/protocols/buf/dxos/client/queue_pb';

/**
 * Stub implementation for when Edge is not available.
 */
export class QueueServiceStub implements Echo.QueueService {
  queryQueue(request: QueryQueueRequest): Promise<QueueQueryResult> {
    throw new Error('Not available.');
  }

  insertIntoQueue(_request: InsertIntoQueueRequest): Promise<Empty> {
    throw new Error('Not available.');
  }

  deleteFromQueue(_request: DeleteFromQueueRequest): Promise<Empty> {
    throw new Error('Not available.');
  }

  async syncQueue(_: SyncQueueRequest): Promise<Empty> {
    throw new Error('Not available.');
  }
}
