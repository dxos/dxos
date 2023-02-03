//
// Copyright 2021 DXOS.org
//

import { ClientServicesProvider, ClientServicesProxy, ShellController } from '@dxos/client-services';
import { RemoteServiceConnectionTimeout } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { Profile } from '@dxos/protocols/proto/dxos/client';
import { ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { RpcPort } from '@dxos/rpc';
import { createIFrame, createIFramePort } from '@dxos/rpc-tunnel';

import { DEFAULT_CLIENT_CHANNEL, DEFAULT_CLIENT_ORIGIN, DEFAULT_SHELL_CHANNEL } from './config';

export type IFrameClientServicesProxyOptions = {
  source: string;
  channel: string;
  shell: boolean | string;
  timeout: number;
};

/**
 * Proxy to host client service via iframe.
 */
// TODO(burdon): Move to client-services.
export class IFrameClientServicesProxy implements ClientServicesProvider {
  private readonly params;
  private _iframe?: HTMLIFrameElement;
  private _clientServicesProxy?: ClientServicesProxy;
  private _shellController?: ShellController;

  constructor({
    source = DEFAULT_CLIENT_ORIGIN,
    channel = DEFAULT_CLIENT_CHANNEL,
    shell = DEFAULT_SHELL_CHANNEL,
    timeout = 1000
  }: Partial<IFrameClientServicesProxyOptions> = {}) {
    this.params = { source, channel, shell, timeout };
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

  get display() {
    return this._shellController?.display;
  }

  get spaceKey() {
    return this._shellController?.spaceKey;
  }

  get spaceUpdate() {
    return this._shellController?.spaceUpdate;
  }

  async setLayout(layout: ShellLayout) {
    await this._shellController?.setLayout(layout);
  }

  async open() {
    if (!this._clientServicesProxy) {
      this._clientServicesProxy = new ClientServicesProxy(await this._getIFramePort(this.params.channel));
    }

    if (!this._shellController && typeof this.params.shell === 'string') {
      this._shellController = new ShellController(await this._getIFramePort(this.params.shell));
      this._iframe!.classList.add('__DXOS_SHELL');
      this._shellController.displayUpdate.on((display) => {
        this._iframe!.style.display = display === ShellDisplay.NONE ? 'none' : '';
      });
    }

    await this._clientServicesProxy.open();
    await this._shellController?.open();
    if (this._shellController) {
      const identity = await new Promise<Profile | undefined>((resolve) => {
        if (!this._clientServicesProxy) {
          resolve(undefined);
          return;
        }

        this._clientServicesProxy.services.ProfileService.subscribeProfile().subscribe(({ profile }) => {
          resolve(profile);
        });
      });

      identity || this._shellController.setLayout(ShellLayout.AUTH);
    }
  }

  async close() {
    await this._shellController?.close();
    await this._clientServicesProxy?.close();
    this._shellController = undefined;
    this._clientServicesProxy = undefined;
    if (this._iframe) {
      this._iframe.remove();
      this._iframe = undefined;
    }
  }

  private async _getIFramePort(channel: string): Promise<RpcPort> {
    const source = new URL(
      typeof this.params.shell === 'string' ? this.params.source : `${this.params.source}?shell=false`,
      window.location.origin
    );

    if (!this._iframe) {
      const iframeId = `__DXOS_CLIENT_${PublicKey.random().toHex()}__`;
      this._iframe = createIFrame(source.toString(), iframeId);
      const res = await fetch(source);
      if (res.status >= 400) {
        throw new RemoteServiceConnectionTimeout();
      }
    }

    return createIFramePort({ origin: source.origin, iframe: this._iframe, channel });
  }
}
