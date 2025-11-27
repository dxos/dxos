//
// Copyright 2025 DXOS.org
//

import type { ObjectId, SpaceId } from '@dxos/keys';
import { type QueueService as QueueServiceProto } from '@dxos/protocols';
import type { EdgeFunctionEnv, QueryResult, QueueQuery } from '@dxos/protocols';

export class QueueServiceImpl implements QueueServiceProto {
  constructor(
    protected _ctx: EdgeFunctionEnv.ExecutionContext,
    private readonly _queueService: EdgeFunctionEnv.QueueService,
  ) {}
  queryQueue(subspaceTag: string, spaceId: SpaceId, { queueId, ...query }: QueueQuery): Promise<QueryResult> {
    return this._queueService.query(this._ctx, `dxn:queue:${subspaceTag}:${spaceId}:${queueId}`, query);
  }
  insertIntoQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objects: unknown[]): Promise<void> {
    return this._queueService.append(this._ctx, `dxn:queue:${subspaceTag}:${spaceId}:${queueId}`, objects);
  }
  deleteFromQueue(subspaceTag: string, spaceId: SpaceId, queueId: ObjectId, objectIds: ObjectId[]): Promise<void> {
    throw new Error('Deleting from queue is not supported.');
  }
}
