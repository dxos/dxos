//
// Copyright 2023 DXOS.org
//

import { type Config } from '@dxos/config';

import { type AgentHostingProviderClient } from './agent-hosting-provider';

export class FakeAgentHostingProvider implements AgentHostingProviderClient {
  private _agents: Map<string, string> = new Map();
  constructor(private readonly _clientConfig: Config) {}

  public async createAgent(invitationCode: string, identityKey: string): Promise<string> {
    const agentID = crypto.randomUUID();
    this._agents.set(identityKey, agentID);
    return agentID;
  }

  public async getAgent(agentID: string): Promise<string | null> {
    return this._agents.get(agentID) ?? null;
  }

  public async destroyAgent(agentID: string): Promise<boolean> {
    return this._agents.delete(agentID);
  }
}
