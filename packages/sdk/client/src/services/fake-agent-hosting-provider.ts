//
// Copyright 2023 DXOS.org
//

import { sleep } from '@dxos/async';

import { type AgentHostingProviderClient } from './agent-hosting-provider';

export class FakeAgentHostingProvider implements AgentHostingProviderClient {
  private _agents: Map<string, string> = new Map();
  constructor(private _throw: boolean = false) {}

  public async createAgent(invitationCode: string, identityKey: string): Promise<string> {
    await sleep(3e3);
    const agentID = crypto.randomUUID();
    this._agents.set(identityKey, agentID);
    return agentID;
  }

  public async getAgent(agentID: string): Promise<string | null> {
    await sleep(3e3);
    return this._agents.get(agentID) ?? null;
  }

  public async destroyAgent(agentID: string): Promise<boolean> {
    await sleep(3e3);
    return this._agents.delete(agentID);
  }

  public init(authToken: any) {
    return true;
  }
}
