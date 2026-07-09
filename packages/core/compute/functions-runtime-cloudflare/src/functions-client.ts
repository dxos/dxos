//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';

import { Resource } from '@dxos/context';
import { EchoClient } from '@dxos/echo-client';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { type EdgeFunctionEnv, makeInProcessClient } from '@dxos/protocols';
import { DataService, QueryService } from '@dxos/protocols/rpc';

import { ServiceContainer } from './internal';
import { SpaceProxy } from './space-proxy';

type Services = {
  dataService: EdgeFunctionEnv.DataService;
  queueService: EdgeFunctionEnv.QueueService;
  functionsAiService: EdgeFunctionEnv.FunctionsAiService;
};

/**
 * API for functions to integrate with ECHO and HALO.
 * @deprecated
 */
export class FunctionsClient extends Resource {
  private readonly _serviceContainer;
  private readonly _echoClient;
  private readonly _executionContext: EdgeFunctionEnv.TraceContext = {};
  private _serviceScope?: Scope.CloseableScope;

  private readonly _spaces = new Map<SpaceId, SpaceProxy>();

  constructor(services: Services) {
    super();
    invariant(typeof services.dataService !== 'undefined', 'DataService is required');
    invariant(typeof services.queueService !== 'undefined', 'QueueService is required');
    this._serviceContainer = new ServiceContainer(
      this._executionContext,
      services.dataService,
      services.queueService,
      services.functionsAiService,
    );
    this._echoClient = new EchoClient({});
  }

  get echo(): EchoClient {
    return this._echoClient;
  }

  protected override async _open() {
    const services = await this._serviceContainer.createServices();
    // Bridge the host Handlers to the effect-rpc client surface in-process (no wire).
    this._serviceScope = Effect.runSync(Scope.make());
    const [dataService, queryService] = await Effect.runPromise(
      Effect.all([
        makeInProcessClient(DataService.Rpcs, services.dataService),
        makeInProcessClient(QueryService.Rpcs, services.queryService),
      ]).pipe(Effect.provideService(Scope.Scope, this._serviceScope)),
    );
    this._echoClient.connectToService({ dataService, queryService });
    await this._echoClient.open();
  }

  protected override async _close() {
    for (const space of this._spaces.values()) {
      await space.close();
    }
    this._spaces.clear();

    await this._echoClient.close();
    if (this._serviceScope) {
      await Effect.runPromise(Scope.close(this._serviceScope, Exit.void));
      this._serviceScope = undefined;
    }
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
    functionsAiService: env.FUNCTIONS_AI_SERVICE,
  });
  await client.open();
  return client;
};
