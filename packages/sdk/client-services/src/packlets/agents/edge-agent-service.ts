//
// Copyright 2024 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { type EdgeConnection } from '@dxos/edge-client';
import { EdgeAgentStatus } from '@dxos/protocols';
import {
  QueryAgentStatusResponse,
  QueryEdgeStatusResponse,
  type EdgeAgentService,
} from '@dxos/protocols/proto/dxos/client/services';

import { type EdgeAgentManager } from './edge-agent-manager';

// TODO(wittjosiah): This service is not currently exposed on the client api, it must be called directly.
export class EdgeAgentServiceImpl implements EdgeAgentService {
  constructor(
    private readonly _agentManagerProvider: () => Promise<EdgeAgentManager>,
    private readonly _edgeConnection?: EdgeConnection,
  ) {}

  queryEdgeStatus(): Stream<QueryEdgeStatusResponse> {
    return new Stream(({ ctx, next }) => {
      next({ status: QueryEdgeStatusResponse.EdgeStatus.NOT_CONNECTED });
      if (!this._edgeConnection) {
        return;
      }

      ctx.onDispose(
        // TODO(wittjosiah): EdgeConnection should include a disconnected event as well.
        this._edgeConnection.onReconnected(() => {
          next({ status: QueryEdgeStatusResponse.EdgeStatus.CONNECTED });
        }),
      );
    });
  }

  async createAgent(): Promise<void> {
    return (await this._agentManagerProvider()).createAgent();
  }

  queryAgentStatus(): Stream<QueryAgentStatusResponse> {
    return new Stream(({ ctx, next }) => {
      next({ status: QueryAgentStatusResponse.AgentStatus.UNKNOWN });
      void this._agentManagerProvider().then((agentManager) => {
        next({ status: mapStatus(agentManager.agentStatus) });
        agentManager.agentStatusChanged.on(ctx, (newStatus) => {
          next({ status: mapStatus(newStatus) });
        });
      });
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
