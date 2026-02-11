//
// Copyright 2024 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { type EdgeConnection } from '@dxos/edge-client';
import { type Client, EdgeAgentStatus } from '@dxos/protocols';
import { type Empty, EmptySchema, create } from '@dxos/protocols/buf';
import {
  EdgeStatus_ConnectionState,
  type QueryAgentStatusResponse,
  QueryAgentStatusResponseSchema,
  QueryAgentStatusResponse_AgentStatus,
  type QueryEdgeStatusResponse,
  QueryEdgeStatusResponseSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';

import { type EdgeAgentManager } from './edge-agent-manager';

// TODO(wittjosiah): This service is not currently exposed on the client api, it must be called directly.
export class EdgeAgentServiceImpl implements Client.EdgeAgentService {
  constructor(
    private readonly _agentManagerProvider: () => Promise<EdgeAgentManager>,
    private readonly _edgeConnection?: EdgeConnection,
  ) {}

  // TODO(mykola): Reconcile with NetworkService.queryStatus.
  queryEdgeStatus(): Stream<QueryEdgeStatusResponse> {
    return new Stream(({ ctx, next }) => {
      const update = () => {
        next(
          create(QueryEdgeStatusResponseSchema, {
            status: this._edgeConnection?.status ?? {
              state: EdgeStatus_ConnectionState.NOT_CONNECTED,
              rtt: 0,
              uptime: 0,
              rateBytesUp: 0,
              rateBytesDown: 0,
              messagesSent: 0,
              messagesReceived: 0,
            },
          }),
        );
      };

      this._edgeConnection?.statusChanged.on(ctx, update);
      update();
    });
  }

  async createAgent(): Promise<Empty> {
    await (await this._agentManagerProvider()).createAgent();
    return create(EmptySchema);
  }

  queryAgentStatus(): Stream<QueryAgentStatusResponse> {
    return new Stream(({ ctx, next }) => {
      next(create(QueryAgentStatusResponseSchema, { status: QueryAgentStatusResponse_AgentStatus.UNKNOWN }));
      void this._agentManagerProvider().then((agentManager) => {
        next(create(QueryAgentStatusResponseSchema, { status: mapStatus(agentManager.agentStatus) }));
        agentManager.agentStatusChanged.on(ctx, (newStatus) => {
          next(create(QueryAgentStatusResponseSchema, { status: mapStatus(newStatus) }));
        });
      });
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
