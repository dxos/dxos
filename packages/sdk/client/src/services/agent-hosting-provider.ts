//
// Copyright 2023 DXOS.org
//

import { type Config } from '@dxos/config';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type AgentHostingProvider = {
  name: string;
  baseURL: string;
  username: string;
  password?: string;
};

/**
 * Cannot communicate with, or decode response from hosting provider.
 */
export class ProviderApiError extends Error {}

// TODO: Load from config or dynamically discover
const defaultConfig: AgentHostingProvider = {
  name: 'default',
  baseURL: 'http://localhost:8082/v1alpha1/',
  username: 'dxos',
};

export interface AgentHostingProviderClient {
  createAgent(invitationCode: string, identityKey: string): Promise<string>;
  getAgent(agentID: string): Promise<string | null>;
  destroyAgent(agentID: string): Promise<boolean>;
}

// Interface to REST API to manage agent deployments
// TODO(nf): for now API just simply returns created k8s CRD objects, define backend-agnostic API
export class DXOSAgentHostingProviderClient implements AgentHostingProviderClient {
  private readonly _config: AgentHostingProvider;
  constructor(private readonly _clientConfig: Config) {
    const runtimeAgentHostingConfig = this._clientConfig.get('runtime.services.agentHosting');
    invariant(runtimeAgentHostingConfig, 'agentHosting config not found');
    invariant(runtimeAgentHostingConfig.server, 'agentHosting server not found');
    this._config = {
      ...defaultConfig,
      baseURL: runtimeAgentHostingConfig.server,
      password: this._clientConfig.get('runtime.app.env.DX_AGENTHOSTING_PASSWORD'),
    };
    log.info('AgentHostingProviderClient initialized', { config: this._config });
  }

  public requestInitWithCredentials(req: RequestInit): RequestInit {
    return {
      ...req,
      headers: {
        ...req.headers,
        Authorization: 'Basic ' + Buffer.from(`${this._config.username}:${this._config.password}`).toString('base64'),
      },
    };
  }

  public async createAgent(invitationCode: string, identityKey: string) {
    const res = await fetch(
      new URL('agent', this._config.baseURL),
      this.requestInitWithCredentials({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitation: invitationCode,
          identityKey,
        }),
      }),
    );

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
    const res = await fetch(
      new URL('agent/' + agentID, this._config.baseURL),
      this.requestInitWithCredentials({
        method: 'GET',
      }),
    );
    // TODO(nf): is Sentry logging this and causing the log message?
    if (res.status === 404) {
      return null;
    }
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
        log.warn('failed to parse response from agent get', { err });
        throw new ProviderApiError('failed to parse response from hosting provider');
      }
      log.warn('bad response from agent get', { res });
      throw new ProviderApiError('bad response from hosting provider');
    }
  }

  public async destroyAgent(agentID: string) {
    const res = await fetch(
      new URL('agent/' + agentID, this._config.baseURL),
      this.requestInitWithCredentials({
        method: 'DELETE',
      }),
    );

    if (res.status === 204) {
      return true;
    }

    log.warn('failed to send destroy request', { status: res.status, statusText: res.statusText });
    throw new ProviderApiError('bad response from hosting provider');
  }
}
