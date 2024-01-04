//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';

export type AgentHostingProvider = {
  name: string;
  baseURL: string;
};

/**
 * Cannot communicate with, or decode response from hosting provider.
 */
export class ProviderApiError extends Error {}

// TODO: Load from config or dynamically discover
const defaultConfig: AgentHostingProvider = {
  name: 'default',
  baseURL: 'http://localhost:8082/v1alpha1/',
};

// Interface to REST API to manage agent deployments
// TODO(nf): for now API just simply returns created k8s CRD objects, define backend-agnostic API
export class AgentHostingProviderClient {
  constructor(private readonly _config = defaultConfig) {}

  public async createAgent(invitationCode: string, identityKey: string) {
    const res = await fetch(new URL('agent', this._config.baseURL), {
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
    } catch (err) {
      if (err instanceof TypeError) {
        log.warn('failed to parse response from agent create', { res });
        throw new ProviderApiError('failed to parse response from hosting provider');
      }
      log.warn('bad response from agent create', { res });
      throw new ProviderApiError('bad response from hosting provider');
    }
  }

  public async getAgent(agentID: string) {
    const res = await fetch(new URL('agent/' + agentID, this._config.baseURL));
    if (res.status !== 200) {
      log.warn('request to agent get failed', { res });
      throw new ProviderApiError('bad response from hosting provider');
    }

    log.info('getAgent', { res });

    try {
      const agent = await res.json();
      return agent.metadata.uid;
    } catch (err) {
      if (err instanceof TypeError) {
        log.warn('failed to parse response from agent create', { res });
        throw new ProviderApiError('failed to parse response from hosting provider');
      }
      log.warn('bad response from agent create', { res });
      throw new ProviderApiError('bad response from hosting provider');
    }
  }

  public async destroyAgent(agentID: string) {
    const res = await fetch(new URL('agent/' + agentID, this._config.baseURL), {
      method: 'DELETE',
    });

    if (res.status === 204) {
      return true;
    }

    log.warn('failed to send destroy request', { status: res.status, statusText: res.statusText });
    throw new ProviderApiError('bad response from hosting provider');
  }
}
