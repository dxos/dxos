//
// Copyright 2025 DXOS.org
//

import { NotImplementedError, RuntimeServiceError } from '@dxos/errors';
import type { ObjectId, SpaceId } from '@dxos/keys';
import { type QueueService as QueueServiceProto } from '@dxos/protocols';
import type {
  EdgeFunctionEnv,
  QueryResult,
  QueueQuery,
  QueryQueueRequest,
  InsertIntoQueueRequest,
  DeleteFromQueueRequest,
} from '@dxos/protocols';

export class QueueServiceImpl implements QueueServiceProto {
  constructor(
    protected _ctx: EdgeFunctionEnv.ExecutionContext,
    private readonly _queueService: EdgeFunctionEnv.QueueService,
  ) {}
  async queryQueue(request: QueryQueueRequest): Promise<QueryResult> {
    const { subspaceTag, spaceId, query } = request;
    const { queueId, ...filter } = query!;
    try {
      using result = await this._queueService.query(
        this._ctx,
        `dxn:queue:${subspaceTag}:${spaceId}:${queueId}`,
        filter,
      );
      return {
        // Copy returned object to avoid hanging RPC stub
        // See https://developers.cloudflare.com/workers/runtime-apis/rpc/lifecycle/
        objects: structuredClone(result.objects),
        nextCursor: result.nextCursor,
        prevCursor: result.prevCursor,
      };
    } catch (error) {
      throw RuntimeServiceError.wrap({
        message: 'Queue query failed.',
        context: { subspaceTag, spaceId, queueId },
        ifTypeDiffers: true,
      })(error);
    }
  }

  async insertIntoQueue(request: InsertIntoQueueRequest): Promise<void> {
    const { subspaceTag, spaceId, queueId, objects } = request;
    try {
      await this._queueService.append(this._ctx, `dxn:queue:${subspaceTag}:${spaceId}:${queueId}`, objects ?? []);
    } catch (error) {
      throw RuntimeServiceError.wrap({
        message: 'Queue append failed.',
        context: { subspaceTag, spaceId, queueId },
        ifTypeDiffers: true,
      })(error);
    }
  }

  deleteFromQueue(request: DeleteFromQueueRequest): Promise<void> {
    const { subspaceTag, spaceId, queueId } = request;
    throw new NotImplementedError({
      message: 'Deleting from queue is not supported.',
      context: { subspaceTag, spaceId, queueId },
    });
  }
}
