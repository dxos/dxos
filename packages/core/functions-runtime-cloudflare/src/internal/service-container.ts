//
// Copyright 2024 DXOS.org
//

import type { HasId } from '@dxos/echo/internal';
import { type DXN, type SpaceId } from '@dxos/keys';
import type { QueryResult } from '@dxos/protocols';
import { type EdgeFunctionEnv } from '@dxos/protocols';
import { type QueueService as QueueServiceProto } from '@dxos/protocols';
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
    private readonly _aiService: EdgeFunctionEnv.AiService,
  ) {}

  async getSpaceMeta(spaceId: SpaceId): Promise<EdgeFunctionEnv.SpaceMeta | undefined> {
    return this._dataService.getSpaceMeta(this._executionContext, spaceId);
  }

  async createServices(): Promise<{
    dataService: DataServiceProto;
    queryService: QueryServiceProto;
    queueService: QueueServiceProto;
    aiService: EdgeFunctionEnv.AiService;
  }> {
    const dataService = new DataServiceImpl(this._executionContext, this._dataService);
    const queryService = new QueryServiceImpl(this._executionContext, this._dataService);
    const queueService = new QueueServiceImpl(this._executionContext, this._queueService);

    return {
      dataService,
      queryService,
      queueService,
      aiService: this._aiService,
    };
  }

  queryQueue(queue: DXN): Promise<QueryResult> {
    return this._queueService.query({}, queue.toString(), {});
  }

  insertIntoQueue(queue: DXN, objects: HasId[]): Promise<void> {
    return this._queueService.append({}, queue.toString(), objects);
  }
}
