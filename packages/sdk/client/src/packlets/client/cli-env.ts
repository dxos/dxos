//
// Copyright 2023 DXOS.org
//

import { ClientServices, ClientServicesProvider, ENV_DX_PROFILE, ENV_DX_PROFILE_DEFAULT, clientServiceBundle } from '@dxos/client-protocol';
import { log } from '@dxos/log';
import { ServiceBundle } from '@dxos/rpc';
import type { WebsocketRpcClient } from '@dxos/websocket-rpc';

export type FromCliEnvOptions = {
  profile?: string;
};

/**
 * Connects to locally running CLI daemon.
 */
export const fromCliEnv = ({
  profile = process.env[ENV_DX_PROFILE] ?? ENV_DX_PROFILE_DEFAULT,
}: FromCliEnvOptions = {}): ClientServicesProvider => {
  return new CliEnvClientServiceProvider(profile);
};

export class CliEnvClientServiceProvider implements ClientServicesProvider {
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
      url: `ws+unix://${process.env.HOME}/.dx/run/${this._profile}.sock`,
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
