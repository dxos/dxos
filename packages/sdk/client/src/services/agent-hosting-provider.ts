//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';

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
// TODO(nf): for now API just simply returns created k8s CRD objects, define backend-agnostic API
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

    try {
      const agent = await res.json();
      return agent.metadata.uid;
    } catch (e) {
      if (e instanceof TypeError) {
        log.warn('failed to parse response from agent create', { res });
        return null;
      }
      log.warn('bad response from agent create', { res });
    }
  }

  public async getAgent(agentID: string) {
    const res = await fetch(new URL('agent/' + agentID, this.agentHostingProvider.BaseURL));
    if (res.status !== 200) {
      log.warn('request to agent get failed', { res });
      return null;
    }

    log.info('getAgent', { res });

    try {
      const agent = await res.json();
      return agent.metadata.uid;
    } catch (e) {
      if (e instanceof TypeError) {
        log.warn('failed to parse response from agent create', { res });
        return null;
      }
      log.warn('bad response from agent create', { res });
    }
  }

  public async destroyAgent(agentID: string) {
    const res = await fetch(new URL('agent/' + agentID, this.agentHostingProvider.BaseURL), {
      method: 'DELETE',
    });

    if (res.status === 204) {
      return true;
    }

    log.warn('failed to send destroy request', { status: res.status, statusText: res.statusText });

    return false;
  }
}
