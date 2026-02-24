//
// Copyright 2025 DXOS.org
//

import { NotImplementedError, RuntimeServiceError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { type Echo, type EdgeFunctionEnv, type FeedProtocol } from '@dxos/protocols';
import { bufToProto, EMPTY, type Empty } from '@dxos/protocols/buf';
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
    const { query } = request;
    const { queueIds, ...filter } = query!;
    const spaceId = query!.spaceId;
    const queueId = queueIds?.[0];
    invariant(request.query!.queuesNamespace);
    try {
      using result = await this._queueService.query(
        this._ctx,
        `dxn:queue:${request.query!.queuesNamespace}:${spaceId}:${queueId}`,
        bufToProto<Omit<FeedProtocol.QueueQuery, 'queueId'>>(filter),
      );
      return {
        // Copy returned object to avoid hanging RPC stub
        // See https://developers.cloudflare.com/workers/runtime-apis/rpc/lifecycle/
        objects: structuredClone(result.objects),
        nextCursor: result.nextCursor,
        prevCursor: result.prevCursor,
      } as QueueQueryResult;
    } catch (error) {
      throw RuntimeServiceError.wrap({
        message: 'Queue query failed.',
        context: { subspaceTag: request.query!.queuesNamespace, spaceId, queueId },
        ifTypeDiffers: true,
      })(error);
    }
  }

  async insertIntoQueue(request: InsertIntoQueueRequest): Promise<Empty> {
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
    return EMPTY;
  }

  deleteFromQueue(request: DeleteFromQueueRequest): Promise<Empty> {
    const { subspaceTag, spaceId, queueId } = request;
    throw new NotImplementedError({
      message: 'Deleting from queue is not supported.',
      context: { subspaceTag, spaceId, queueId },
    });
  }
}
