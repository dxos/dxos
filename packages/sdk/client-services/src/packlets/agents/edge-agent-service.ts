//
// Copyright 2024 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { type EdgeConnection } from '@dxos/edge-client';
import { EdgeAgentStatus } from '@dxos/protocols';
import {
  type EdgeAgentService,
  EdgeStatus,
  QueryAgentStatusResponse,
  type QueryEdgeStatusResponse,
} from '@dxos/protocols/proto/dxos/client/services';

import { type EdgeAgentManager } from './edge-agent-manager';

// TODO(wittjosiah): This service is not currently exposed on the client api, it must be called directly.
export class EdgeAgentServiceImpl implements EdgeAgentService {
  constructor(
    private readonly _agentManagerProvider: () => Promise<EdgeAgentManager>,
    private readonly _edgeConnection?: EdgeConnection,
  ) {}

  // TODO(mykola): Reconcile with NetworkService.queryStatus.
  queryEdgeStatus(): Stream<QueryEdgeStatusResponse> {
    return new Stream(({ ctx, next }) => {
      const update = () => {
        next({
          status: this._edgeConnection?.status ?? {
            state: EdgeStatus.ConnectionState.NOT_CONNECTED,
            latency: 0,
            uptime: 0,
            rateBytesUp: 0,
            rateBytesDown: 0,
          },
        });
      };

      this._edgeConnection?.statusChanged.on(ctx, update);
      update();
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
