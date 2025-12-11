//
// Copyright 2025 DXOS.org
//

import { NotImplementedError, RuntimeServiceError } from '@dxos/errors';
import type { ObjectId, SpaceId } from '@dxos/keys';
import { type QueueService as QueueServiceProto } from '@dxos/protocols';
import type { EdgeFunctionEnv, QueryResult, QueueQuery } from '@dxos/protocols';

export class QueueServiceImpl implements QueueServiceProto {
  constructor(
    protected _ctx: EdgeFunctionEnv.ExecutionContext,
    private readonly _queueService: EdgeFunctionEnv.QueueService,
  ) {}
  async queryQueue(subspaceTag: string, spaceId: SpaceId, { queueId, ...query }: QueueQuery): Promise<QueryResult> {
    try {
      const result = await this._queueService.query(this._ctx, `dxn:queue:${subspaceTag}:${spaceId}:${queueId}`, query);
      return result;
    } catch (error) {
      throw RuntimeServiceError.wrap({
        message: 'Queue query failed.',
        context: { subspaceTag, spaceId, queueId },
        ifTypeDiffers: true,
      })(error);
    }
  }

  async insertIntoQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objects: unknown[]): Promise<void> {
    try {
      const result = await this._queueService.append(
        this._ctx,
        `dxn:queue:${subspaceTag}:${spaceId}:${queueId}`,
        objects,
      );
      return result;
    } catch (error) {
      throw RuntimeServiceError.wrap({
        message: 'Queue append failed.',
        context: { subspaceTag, spaceId, queueId },
        ifTypeDiffers: true,
      })(error);
    }
  }

  deleteFromQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, _objectIds: ObjectId[]): Promise<void> {
    throw new NotImplementedError({
      message: 'Deleting from queue is not supported.',
      context: { subspaceTag, spaceId, queueId },
    });
  }
}
