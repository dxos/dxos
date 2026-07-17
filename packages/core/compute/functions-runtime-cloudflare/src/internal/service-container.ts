//
// Copyright 2024 DXOS.org
//

import { type AnyEntity } from '@dxos/echo/Type';
import { EID, type SpaceId } from '@dxos/keys';
import { type EdgeFunctionEnv, type FeedProtocol } from '@dxos/protocols';
import { type DataService, type FeedService, type QueryService } from '@dxos/protocols/rpc';

import { DataServiceImpl } from './data-service-impl';
import { FeedServiceImpl } from './feed-service-impl';
import { QueryServiceImpl } from './query-service-impl';

/**
 * Constructs the ECHO/queue service handlers for the edge (Cloudflare) runtime. The handlers
 * implement the effect-rpc `Handlers` shape shared with the web backend, so consumers use the
 * same service surface regardless of runtime.
 */
export class ServiceContainer {
  constructor(
    private readonly _executionContext: EdgeFunctionEnv.TraceContext,
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
    dataService: DataService.Handlers;
    queryService: QueryService.Handlers;
    queueService: FeedService.Handlers;
    functionsAiService: EdgeFunctionEnv.FunctionsAiService;
  }> {
    const dataService = new DataServiceImpl(this._executionContext, this._dataService);
    const queryService = new QueryServiceImpl(this._executionContext, this._dataService);
    const queueService = new FeedServiceImpl(this._executionContext, this._queueService);

    return {
      dataService,
      queryService,
      queueService,
      functionsAiService: this._functionsService,
    };
  }

  async queryQueue(queue: EID.EID): Promise<FeedProtocol.QueryResult> {
    const spaceId = EID.getSpaceId(queue);
    const queueId = EID.getEntityId(queue);
    if (!spaceId || !queueId) {
      throw new Error('Invalid queue EID');
    }
    const result = await this._queueService.queryQueue(this._executionContext, {
      query: {
        spaceId,
        feedIds: [queueId],
      },
    });

    return {
      objects: structuredClone(result.objects),
      nextCursor: result.nextCursor ?? null,
      prevCursor: result.prevCursor ?? null,
    };
  }

  async insertIntoQueue(queue: EID.EID, objects: AnyEntity[]): Promise<void> {
    const spaceId = EID.getSpaceId(queue);
    const queueId = EID.getEntityId(queue);
    if (!spaceId || !queueId) {
      throw new Error('Invalid queue EID');
    }
    // TODO(dmaretskyi): EID does not encode the subspaceTag — defaulting to 'data'.
    await this._queueService.insertIntoQueue(this._executionContext, {
      subspaceTag: 'data',
      spaceId,
      feedId: queueId,
      objects: objects.map((obj) => JSON.stringify(obj)),
    });
  }
}
