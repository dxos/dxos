//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesProvider,
  type ClientServicesRpc,
  DEFAULT_PROFILE,
  DX_RUNTIME,
  DXEnv,
  clientServiceBundle,
  getProfilePath,
  makeRpcFromServices,
} from '@dxos/client-protocol';
import { ClientServicesProviderResource } from '@dxos/client-protocol';
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
  profile = DXEnv.get(DXEnv.PROFILE, DEFAULT_PROFILE),
}: FromAgentOptions = {}): ClientServicesProvider => {
  return new AgentClientServiceProvider(profile);
};

@trace.resource({ annotation: ClientServicesProviderResource })
export class AgentClientServiceProvider implements ClientServicesProvider {
  // TODO(wittjosiah): Fire an event if the socket disconnects.
  readonly closed = new Event<Error | undefined>();
  private _client?: WebsocketRpcClient<ClientServices, {}>;
  // Derives the effect surface from the protobuf websocket client (no direct effect transport).
  private readonly _rpc: ClientServicesRpc = makeRpcFromServices(() => this.services);

  constructor(private readonly _profile: string) {}

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

  get rpc() {
    return this._rpc;
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
