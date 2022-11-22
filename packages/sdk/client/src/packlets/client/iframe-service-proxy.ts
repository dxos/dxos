//
// Copyright 2021 DXOS.org
//

import { ClientServicesProvider, ClientServicesProxy } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { RpcPort } from '@dxos/rpc';
import { createIFrame, createIFramePort } from '@dxos/rpc-tunnel';

import { DEFAULT_CLIENT_ORIGIN } from '../client';

export type IFrameClientServicesProxyOptions = {
  config: Config;
  channel: string;
  timeout?: number;
};

/**
 * Proxy to host client service via iframe.
 */
// TODO(burdon): Move to client-services.
export class IFrameClientServicesProxy implements ClientServicesProvider {
  private readonly params;
  private _iframeId?: string;
  private _clientServicesProxy?: ClientServicesProxy;

  constructor({ config, channel, timeout = 1000 }: IFrameClientServicesProxyOptions) {
    this.params = { config, channel, timeout };
    this._clientServicesProxy = new ClientServicesProxy(this._getIFramePort());
  }

  get proxy() {
    return this._clientServicesProxy!.proxy;
  }

  get descriptors() {
    return this._clientServicesProxy!.descriptors;
  }

  get services() {
    return this._clientServicesProxy!.services;
  }

  async open() {
    if (!this._clientServicesProxy) {
      this._clientServicesProxy = new ClientServicesProxy(this._getIFramePort());
    }

    return this._clientServicesProxy.open();
  }

  async close() {
    await this._clientServicesProxy?.close();
    this._clientServicesProxy = undefined;
    if (this._iframeId) {
      document.getElementById(this._iframeId)?.remove();
      this._iframeId = undefined;
    }
  }

  private _getIFramePort(): RpcPort {
    this._iframeId = `__DXOS_CLIENT_${PublicKey.random().toHex()}__`;
    const source = new URL(
      this.params.config.get('runtime.client.remoteSource') ?? DEFAULT_CLIENT_ORIGIN,
      window.location.origin
    );
    const iframe = createIFrame(source.toString(), this._iframeId);
    return createIFramePort({ origin: source.origin, iframe, channel: this.params.channel });
  }
}
