//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import {
  DX_RUNTIME,
  ENV_DX_PROFILE,
  ENV_DX_PROFILE_DEFAULT,
  type ClientServices,
  type ClientServicesProvider,
  clientServiceBundle,
  getProfilePath,
} from '@dxos/client-protocol';
import { ClientServicesProviderResource } from '@dxos/client-services';
import { log } from '@dxos/log';
import { type ServiceBundle } from '@dxos/rpc';
import { trace } from '@dxos/tracing';
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

@trace.resource({ annotation: ClientServicesProviderResource })
export class AgentClientServiceProvider implements ClientServicesProvider {
  // TODO(wittjosiah): Fire an event if the socket disconnects.
  readonly closed = new Event<Error | undefined>();
  readonly fatal = new Event<Error>();
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

    this._client.error.on((error) => {
      this.closed.emit(error);
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
