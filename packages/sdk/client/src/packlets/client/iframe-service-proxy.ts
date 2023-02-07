//
// Copyright 2021 DXOS.org
//

import { ClientServicesProvider, ClientServicesProxy, ShellController } from '@dxos/client-services';
import { RemoteServiceConnectionTimeout } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { Profile } from '@dxos/protocols/proto/dxos/client';
import { LayoutRequest, ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
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
  private readonly _options;
  private _iframe?: HTMLIFrameElement;
  private _clientServicesProxy?: ClientServicesProxy;
  private _shellController?: ShellController;

  constructor({
    source = DEFAULT_CLIENT_ORIGIN,
    channel = DEFAULT_CLIENT_CHANNEL,
    shell = DEFAULT_SHELL_CHANNEL,
    timeout = 1000
  }: Partial<IFrameClientServicesProxyOptions> = {}) {
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._options = { source, channel, shell, timeout };
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

  get contextUpdate() {
    return this._shellController?.contextUpdate;
  }

  async setLayout(layout: ShellLayout, options: Omit<LayoutRequest, 'layout'> = {}) {
    await this._shellController?.setLayout(layout, options);
  }

  setCurrentSpace(key?: PublicKey) {
    this._shellController?.setSpace(key);
  }

  async open() {
    if (!this._clientServicesProxy) {
      this._clientServicesProxy = new ClientServicesProxy(await this._getIFramePort(this._options.channel));
    }

    if (!this._shellController && typeof this._options.shell === 'string') {
      this._shellController = new ShellController(await this._getIFramePort(this._options.shell));
      this._iframe!.classList.add('__DXOS_SHELL');
      this._shellController.contextUpdate.on(({ display }) => {
        this._iframe!.style.display = display === ShellDisplay.NONE ? 'none' : '';
      });

      window.addEventListener('keydown', this._handleKeyDown);
    }

    await this._clientServicesProxy.open();
    await this._shellController?.open();
    if (!this._shellController) {
      return;
    }

    // TODO(wittjosiah): Allow path/params for invitations to be customizable.
    const searchParams = new URLSearchParams(window.location.search);
    const spaceInvitationCode = searchParams.get('spaceInvitationCode');
    if (spaceInvitationCode) {
      await this._shellController.setLayout(ShellLayout.JOIN_SPACE, { invitationCode: spaceInvitationCode });
      return;
    }

    const identity = await new Promise<Profile | undefined>((resolve) => {
      if (!this._clientServicesProxy) {
        resolve(undefined);
        return;
      }

      this._clientServicesProxy.services.ProfileService.subscribeProfile().subscribe(({ profile }) => {
        resolve(profile);
      });
    });

    const haloInvitationCode = searchParams.get('haloInvitationCode');
    if (!identity) {
      await this._shellController.setLayout(ShellLayout.AUTH, { invitationCode: haloInvitationCode ?? undefined });
    }
  }

  async close() {
    window.removeEventListener('keydown', this._handleKeyDown);
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
      typeof this._options.shell === 'string' ? this._options.source : `${this._options.source}?shell=false`,
      window.location.origin
    );

    if (!this._iframe) {
      const iframeId = `__DXOS_CLIENT_${PublicKey.random().toHex()}__`;
      this._iframe = createIFrame(source.toString(), iframeId, { allow: 'clipboard-read; clipboard-write' });
      const res = await fetch(source);
      if (res.status >= 400) {
        throw new RemoteServiceConnectionTimeout();
      }
    }

    return createIFramePort({ origin: source.origin, iframe: this._iframe, channel });
  }

  private async _handleKeyDown(event: KeyboardEvent) {
    if (!this._shellController) {
      return;
    }

    const modifier = event.ctrlKey || event.metaKey;
    if (event.key === '>' && event.shiftKey && modifier) {
      await this._shellController.setLayout(ShellLayout.SPACE_LIST);
    } else if (event.key === '.' && modifier) {
      await this._shellController.setLayout(ShellLayout.CURRENT_SPACE, {
        spaceKey: this._shellController.spaceKey
      });
    }
  }
}
