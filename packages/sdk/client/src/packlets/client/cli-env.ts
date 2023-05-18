//
// Copyright 2023 DXOS.org
//

import { ServiceBundle } from '@dxos/rpc';
import type { WebsocketRpcClient } from '@dxos/websocket-rpc';

import { clientServiceBundle, ClientServices, ClientServicesProvider } from './service-definitions';

export type FromCliEnvOptions = {
  profile?: string;
};

/**
 * Connects to locally running CLI daemon.
 */
export const fromCliEnv = ({ profile = 'default' }: FromCliEnvOptions = {}): ClientServicesProvider => {
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
    await this._client?.close();
  }
}
