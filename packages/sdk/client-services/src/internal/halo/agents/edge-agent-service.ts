//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as EffectStream from 'effect/Stream';

import { RegisterService } from '@dxos/client-protocol';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { Context } from '@dxos/context';
import { type EdgeConnection, EdgeConnectionService } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { EdgeAgentStatus, toServiceError } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import {
  type QueryAgentStatusResponse,
  QueryAgentStatusResponse_AgentStatus,
  QueryAgentStatusResponseSchema,
  type QueryEdgeStatusResponse,
  QueryEdgeStatusResponseSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { EdgeAgentService } from '@dxos/protocols/rpc';
import { RpcRouter } from '@dxos/rpc';

import * as Readiness from '../../../Readiness.ts';
import { type EdgeAgentManager, EdgeAgentManagerService } from './edge-agent-manager.ts';

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

  ['EdgeAgentService.createAgent'](): Effect.Effect<void, BaseError> {
    return Effect.tryPromise({
      try: async () => (await this._agentManagerProvider()).createAgent(Context.default()),
      catch: toServiceError,
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

export const EdgeAgentServiceLayer: Layer.Layer<
  EdgeAgentService.Tag,
  never,
  Readiness.StackReadinessService | EdgeAgentManagerService
> = Layer.effect(
  EdgeAgentService.Tag,
  Effect.gen(function* () {
    const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
    const readiness = yield* Readiness.StackReadinessService;
    const edgeAgentManager = yield* EdgeAgentManagerService;
    return new EdgeAgentServiceImpl(() => readiness.initialized.wait().then(() => edgeAgentManager), edgeConnection);
  }),
);

export const EdgeAgentServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [EdgeAgentManagerService, Readiness.StackReadinessService],
    provides: [EdgeAgentService.Tag],
  },
  () => EdgeAgentServiceLayer,
);

export const EdgeAgentServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [EdgeAgentService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(EdgeAgentService.Rpcs, EdgeAgentService.Tag),
);
