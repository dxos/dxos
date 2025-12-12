//
// Copyright 2024 DXOS.org
//

import { Resource } from '@dxos/context';
import { EchoClient } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { type EdgeFunctionEnv } from '@dxos/protocols';

import { ServiceContainer } from './internal';
import { SpaceProxy } from './space-proxy';

type Services = {
  dataService: EdgeFunctionEnv.DataService;
  queueService: EdgeFunctionEnv.QueueService;
  functionsService: EdgeFunctionEnv.FunctionService;
};

/**
 * API for functions to integrate with ECHO and HALO.
 * @deprecated
 */
export class FunctionsClient extends Resource {
  private readonly _serviceContainer;
  private readonly _echoClient;
  private readonly _executionContext: EdgeFunctionEnv.ExecutionContext = {};

  private readonly _spaces = new Map<SpaceId, SpaceProxy>();

  constructor(services: Services) {
    super();
    invariant(typeof services.dataService !== 'undefined', 'DataService is required');
    invariant(typeof services.queueService !== 'undefined', 'QueueService is required');
    this._serviceContainer = new ServiceContainer(
      this._executionContext,
      services.dataService,
      services.queueService,
      services.functionsService,
    );
    this._echoClient = new EchoClient({});
  }

  get echo(): EchoClient {
    return this._echoClient;
  }

  protected override async _open() {
    const { dataService, queryService } = await this._serviceContainer.createServices();
    this._echoClient.connectToService({ dataService, queryService });
    await this._echoClient.open();
  }

  protected override async _close() {
    for (const space of this._spaces.values()) {
      await space.close();
    }
    this._spaces.clear();

    await this._echoClient.close();
  }

  async getSpace(spaceId: SpaceId): Promise<SpaceProxy> {
    if (!this._spaces.has(spaceId)) {
      const space = new SpaceProxy(this._serviceContainer, this._echoClient, spaceId);
      this._spaces.set(spaceId, space);
    }
    const space = this._spaces.get(spaceId)!;
    await space.open(); // No-op if already open.
    return space;
  }
}

export const createClientFromEnv = async (env: any): Promise<FunctionsClient> => {
  const client = new FunctionsClient({
    dataService: env.DATA_SERVICE,
    queueService: env.QUEUE_SERVICE,
    functionsService: env.FUNCTIONS_SERVICE,
  });
  await client.open();
  return client;
};

/**
 - Provides data access capabilities for user functions.
 - No real-time replication or reactive queries -- function receives a snapshot.
 - Function event contains the metadata but doesn't need to include the data.
 */
