//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { Context } from '@dxos/context';
import { type EdgeConnection } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { EdgeAgentStatus } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import {
  type QueryAgentStatusResponse,
  QueryAgentStatusResponse_AgentStatus,
  QueryAgentStatusResponseSchema,
  type QueryEdgeStatusResponse,
  QueryEdgeStatusResponseSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
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
    return EffectEx.streamFromEmitter<QueryEdgeStatusResponse, Error>((emit) => {
      const ctx = Context.default();
      const update = () => {
        void emit.single(buf.create(QueryEdgeStatusResponseSchema, { status: this._edgeConnection?.status }));
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
    return EffectEx.streamFromEmitter<QueryAgentStatusResponse, Error>((emit) => {
      const ctx = Context.default();
      void emit.single(
        buf.create(QueryAgentStatusResponseSchema, { status: QueryAgentStatusResponse_AgentStatus.UNKNOWN }),
      );
      void this._agentManagerProvider().then((agentManager) => {
        void emit.single(buf.create(QueryAgentStatusResponseSchema, { status: mapStatus(agentManager.agentStatus) }));
        agentManager.agentStatusChanged.on(ctx, (newStatus) => {
          void emit.single(buf.create(QueryAgentStatusResponseSchema, { status: mapStatus(newStatus) }));
        });
      });

      return Effect.promise(() => ctx.dispose());
    });
  }
}

const mapStatus = (agentStatus: EdgeAgentStatus | undefined): QueryAgentStatusResponse_AgentStatus => {
  switch (agentStatus) {
    case EdgeAgentStatus.ACTIVE:
      return QueryAgentStatusResponse_AgentStatus.ACTIVE;
    case EdgeAgentStatus.INACTIVE:
      return QueryAgentStatusResponse_AgentStatus.INACTIVE;
    case EdgeAgentStatus.NOT_FOUND:
      return QueryAgentStatusResponse_AgentStatus.NOT_FOUND;
    case undefined:
      return QueryAgentStatusResponse_AgentStatus.UNKNOWN;
  }
};
