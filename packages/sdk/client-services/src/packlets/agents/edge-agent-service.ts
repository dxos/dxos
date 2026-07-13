//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { Context } from '@dxos/context';
import { type EdgeConnection } from '@dxos/edge-client';
import { EdgeAgentStatus } from '@dxos/protocols';
import {
  EdgeStatus,
  QueryAgentStatusResponse,
  type QueryEdgeStatusResponse,
} from '@dxos/protocols/proto/dxos/client/services';
import { type EdgeAgentService } from '@dxos/protocols/rpc';

import { type EdgeAgentManager } from './edge-agent-manager';

// TODO(wittjosiah): This service is not currently exposed on the client api, it must be called directly.
export class EdgeAgentServiceImpl implements EdgeAgentService.Handlers {
  'constructor'(
    private readonly _agentManagerProvider: () => Promise<EdgeAgentManager>,
    private readonly _edgeConnection?: EdgeConnection,
  ) {}

  // TODO(mykola): Reconcile with NetworkService.queryStatus.
  ['EdgeAgentService.queryEdgeStatus'](): EffectStream.Stream<QueryEdgeStatusResponse, Error> {
    return EffectStream.async<QueryEdgeStatusResponse, Error>((emit) => {
      const ctx = Context.default();
      const update = () => {
        void emit.single({
          status: this._edgeConnection?.status ?? {
            state: EdgeStatus.ConnectionState.NOT_CONNECTED,
            rtt: 0,
            uptime: 0,
            rateBytesUp: 0,
            rateBytesDown: 0,
            messagesSent: 0,
            messagesReceived: 0,
          },
        });
      };

      this._edgeConnection?.statusChanged.on(ctx, update);
      update();

      return Effect.promise(() => ctx.dispose());
    });
  }

  ['EdgeAgentService.createAgent'](): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => (await this._agentManagerProvider()).createAgent(Context.default()),
      catch: (error) => error as Error,
    });
  }

  ['EdgeAgentService.queryAgentStatus'](): EffectStream.Stream<QueryAgentStatusResponse, Error> {
    return EffectStream.async<QueryAgentStatusResponse, Error>((emit) => {
      const ctx = Context.default();
      void emit.single({ status: QueryAgentStatusResponse.AgentStatus.UNKNOWN });
      void this._agentManagerProvider().then((agentManager) => {
        void emit.single({ status: mapStatus(agentManager.agentStatus) });
        agentManager.agentStatusChanged.on(ctx, (newStatus) => {
          void emit.single({ status: mapStatus(newStatus) });
        });
      });

      return Effect.promise(() => ctx.dispose());
    });
  }
}

const mapStatus = (agentStatus: EdgeAgentStatus | undefined): QueryAgentStatusResponse.AgentStatus => {
  switch (agentStatus) {
    case EdgeAgentStatus.ACTIVE:
      return QueryAgentStatusResponse.AgentStatus.ACTIVE;
    case EdgeAgentStatus.INACTIVE:
      return QueryAgentStatusResponse.AgentStatus.INACTIVE;
    case EdgeAgentStatus.NOT_FOUND:
      return QueryAgentStatusResponse.AgentStatus.NOT_FOUND;
    case undefined:
      return QueryAgentStatusResponse.AgentStatus.UNKNOWN;
  }
};
