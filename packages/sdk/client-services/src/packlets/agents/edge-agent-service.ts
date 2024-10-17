//
// Copyright 2024 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { EdgeAgentStatus } from '@dxos/protocols';
import { QueryAgentStatusResponse, type EdgeAgentService } from '@dxos/protocols/proto/dxos/client/services';

import { type EdgeAgentManager } from './edge-agent-manager';

export class EdgeAgentServiceImpl implements EdgeAgentService {
  constructor(private _agentManager: EdgeAgentManager) {}

  public async createAgent(): Promise<void> {
    return this._agentManager.createAgent();
  }

  queryAgentStatus(): Stream<QueryAgentStatusResponse> {
    return new Stream(({ ctx, next }) => {
      next({ status: mapStatus(this._agentManager.agentStatus) });
      this._agentManager.agentStatusChanged.on(ctx, (newStatus) => {
        next({ status: mapStatus(newStatus) });
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
