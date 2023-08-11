//
// Copyright 2023 DXOS.org
//

import {
  DX_RUNTIME,
  ENV_DX_PROFILE,
  ENV_DX_PROFILE_DEFAULT,
  ClientServices,
  ClientServicesProvider,
  clientServiceBundle,
  getProfilePath,
} from '@dxos/client-protocol';
import { log } from '@dxos/log';
import { ServiceBundle } from '@dxos/rpc';
import type { WebsocketRpcClient } from '@dxos/websocket-rpc';

export const getUnixSocket = (profile: string, protocol = 'unix') =>
  `${protocol}://` + getProfilePath(DX_RUNTIME, profile, 'agent.sock');

export type FromAgentOptions = {
  profile?: string;
};

/**
 * Connects to locally running CLI daemon.
 */
export const fromAgent = ({
  profile = process.env[ENV_DX_PROFILE] ?? ENV_DX_PROFILE_DEFAULT,
}: FromAgentOptions = {}): ClientServicesProvider => {
  return new AgentClientServiceProvider(profile);
};

export class AgentClientServiceProvider implements ClientServicesProvider {
  private _client?: WebsocketRpcClient<ClientServices, {}>;

  constructor(private readonly _profile: string) {}

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

  get services(): Partial<ClientServices> {
    return this._client!.rpc;
  }

  async open(): Promise<void> {
    const { WebsocketRpcClient } = await import('@dxos/websocket-rpc');
    this._client = new WebsocketRpcClient({
      url: getUnixSocket(this._profile, 'ws+unix'),
      requested: clientServiceBundle,
      exposed: {},
      handlers: {},
    });

    await this._client.open();
  }

  async close(): Promise<void> {
    try {
      await this._client?.close();
    } catch (err) {
      log.warn('Failed to close', err);
    }
  }
}
