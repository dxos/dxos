//
// Copyright 2024 DXOS.org
//

import { type AnyEntity } from '@dxos/echo/internal';
import { type DXN, type SpaceId } from '@dxos/keys';
import { type EdgeFunctionEnv, type FeedProtocol } from '@dxos/protocols';
import { bufToProto } from '@dxos/protocols/buf';
import { type QueryService as QueryServiceProto } from '@dxos/protocols/proto/dxos/echo/query';
import type { DataService as DataServiceProto } from '@dxos/protocols/proto/dxos/echo/service';

import { DataServiceImpl } from './data-service-impl';
import { QueryServiceImpl } from './query-service-impl';
import { QueueServiceImpl } from './queue-service-impl';

/**
 * TODO: make this implement DataService and QueryService to unify API over edge and web backend
 */
export class ServiceContainer {
  constructor(
    private readonly _executionContext: EdgeFunctionEnv.ExecutionContext,
    private readonly _dataService: EdgeFunctionEnv.DataService,
    private readonly _queueService: EdgeFunctionEnv.QueueService,
    private readonly _functionsService: EdgeFunctionEnv.FunctionsAiService,
  ) {}

  async getSpaceMeta(spaceId: SpaceId): Promise<EdgeFunctionEnv.SpaceMeta | undefined> {
    using result = await this._dataService.getSpaceMeta(this._executionContext, spaceId);
    // Copy returned object to avoid hanging RPC stub
    // See https://developers.cloudflare.com/workers/runtime-apis/rpc/lifecycle/
    return result
      ? {
          spaceKey: result.spaceKey,
          rootDocumentId: result.rootDocumentId,
        }
      : undefined;
  }

  async createServices(): Promise<{
    dataService: DataServiceProto;
    queryService: QueryServiceProto;
    queueService: FeedProtocol.QueueService;
    functionsAiService: EdgeFunctionEnv.FunctionsAiService;
  }> {
    const dataService = new DataServiceImpl(this._executionContext, this._dataService);
    const queryService = new QueryServiceImpl(this._executionContext, this._dataService);
    const queueService = new QueueServiceImpl(this._executionContext, this._queueService);

    return {
      dataService,
      queryService,
      queueService: bufToProto<FeedProtocol.QueueService>(queueService),
      functionsAiService: this._functionsService,
    };
  }

  async queryQueue(queue: DXN): Promise<FeedProtocol.QueryResult> {
    const parts = queue.asQueueDXN();
    if (!parts) {
      throw new Error('Invalid queue DXN');
    }
    const { subspaceTag, spaceId, queueId } = parts;
    const result = await this._queueService.queryQueue(this._executionContext, {
      query: {
        spaceId,
        queuesNamespace: subspaceTag,
        queueIds: [queueId],
      },
    });
    return {
      objects: structuredClone(result.objects),
      nextCursor: result.nextCursor ?? null,
      prevCursor: result.prevCursor ?? null,
    } as never;
  }

  async insertIntoQueue(queue: DXN, objects: AnyEntity[]): Promise<void> {
    const parts = queue.asQueueDXN();
    if (!parts) {
      throw new Error('Invalid queue DXN');
    }
    const { subspaceTag, spaceId, queueId } = parts;
    await this._queueService.insertIntoQueue(this._executionContext, {
      subspaceTag,
      spaceId,
      queueId,
      objects: objects as FeedProtocol.InsertIntoQueueRequest['objects'],
    });
  }
}
