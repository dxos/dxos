//
// Copyright 2025 DXOS.org
//

import { type Context } from '@dxos/context';
import type {
  DeleteFromQueueRequest,
  InsertIntoQueueRequest,
  QueryQueueRequest,
  QueueQueryResult,
  SyncQueueRequest,
} from '@dxos/protocols/proto/dxos/client/services';

/**
 * Stub implementation for when Edge is not available.
 */
export class QueueServiceStub {
  queryQueue(_ctx: Context, request: QueryQueueRequest): Promise<QueueQueryResult> {
    throw new Error('Not available.');
  }

  insertIntoQueue(_ctx: Context, request: InsertIntoQueueRequest): Promise<void> {
    throw new Error('Not available.');
  }

  deleteFromQueue(_ctx: Context, request: DeleteFromQueueRequest): Promise<void> {
    throw new Error('Not available.');
  }

  syncQueue(_ctx: Context, request: SyncQueueRequest): Promise<void> {
    throw new Error('Not available.');
  }
}
