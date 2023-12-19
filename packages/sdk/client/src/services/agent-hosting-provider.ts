//
// Copyright 2023 DXOS.org
//

export type AgentHostingProvider = {
  name: string;
  BaseURL: string;
};

// TODO: Load from config or dynamically discover
const DEFAULT_AGENT_HOSTING_PROVIDER: AgentHostingProvider = {
  name: 'default',
  BaseURL: 'http://localhost:8082/v1alpha1/',
};

// Interface to REST API to manage agent deployments

export class AgentHostingProviderClient {
  private agentHostingProvider: AgentHostingProvider;
  constructor() {
    this.agentHostingProvider = DEFAULT_AGENT_HOSTING_PROVIDER;
  }

  public async createAgent(invitationCode: string, identityKey: string) {
    const res = await fetch(new URL('agent', this.agentHostingProvider.BaseURL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invitation: invitationCode,
        identityKey,
      }),
    });
    return res;
  }

  public async getAgent(agentID: string) {
    const res = await fetch(new URL('agent/' + agentID, this.agentHostingProvider.BaseURL));

    return res;
  }

  public async destroyAgent(agentID: string) {
    const res = await fetch(new URL('agent/' + agentID, this.agentHostingProvider.BaseURL));

    return res;
  }
}
