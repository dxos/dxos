//
// Copyright 2025 DXOS.org
//

import { RuntimeServiceError } from '@dxos/errors';
import { type Echo, type EdgeFunctionEnv, type FeedProtocol } from '@dxos/protocols';
import { EMPTY, type Empty } from '@dxos/protocols/buf';
import type {
  DeleteFromQueueRequest,
  InsertIntoQueueRequest,
  QueryQueueRequest,
  QueueQueryResult,
} from '@dxos/protocols/buf/dxos/client/queue_pb';

export class QueueServiceImpl implements Echo.QueueService {
  constructor(
    protected _ctx: EdgeFunctionEnv.ExecutionContext,
    private readonly _queueService: EdgeFunctionEnv.QueueService,
  ) {}

  async queryQueue(request: QueryQueueRequest): Promise<QueueQueryResult> {
    try {
      using result = await this._queueService.queryQueue(this._ctx, request);
      // Copy to avoid hanging RPC stub (Workers RPC lifecycle).
      return {
        objects: structuredClone(result.objects),
        nextCursor: result.nextCursor,
        prevCursor: result.prevCursor,
      } as QueueQueryResult;
    } catch (error) {
      const { query } = request;
      throw RuntimeServiceError.wrap({
        message: 'Queue query failed.',
        context: {
          subspaceTag: query?.queuesNamespace,
          spaceId: query?.spaceId,
          queueId: query?.queueIds?.[0],
        },
        ifTypeDiffers: true,
      })(error);
    }
  }

  async insertIntoQueue(request: InsertIntoQueueRequest): Promise<Empty> {
    try {
      using _ = await this._queueService.insertIntoQueue(this._ctx, request);
    } catch (error) {
      const { subspaceTag, spaceId, queueId } = request;
      throw RuntimeServiceError.wrap({
        message: 'Queue append failed.',
        context: { subspaceTag, spaceId, queueId },
        ifTypeDiffers: true,
      })(error);
    }
    return EMPTY;
  }

  async deleteFromQueue(request: DeleteFromQueueRequest): Promise<Empty> {
    try {
      using _ = await this._queueService.deleteFromQueue(this._ctx, request);
    } catch (error) {
      const { subspaceTag, spaceId, queueId } = request;
      throw RuntimeServiceError.wrap({
        message: 'Queue delete failed.',
        context: { subspaceTag, spaceId, queueId },
        ifTypeDiffers: true,
      })(error);
    }
  }

  async syncQueue(_: FeedProtocol.SyncQueueRequest): Promise<void> {
    // No-op in Cloudflare runtime.
  }
}
