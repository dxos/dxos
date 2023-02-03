//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { RemoteServiceConnectionTimeout } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols';
import { OsShellService, ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { createIFrame, createIFramePort } from '@dxos/rpc-tunnel';

import { SHELL_CHANNEL } from './shell-runtime';

const DEFAULT_SRC = 'https://halo.dxos.org/shell.html';

export type ShellControllerOptions = {
  shellSrc: string;
  channel: string;
  timeout: number;
};

// TODO(wittjosiah): Look at avoiding waterfalls of rpc connections.
export class ShellController {
  readonly spaceUpdate = new Event<PublicKey>();
  private readonly _params;
  private _shellRpc?: ProtoRpcPeer<{ OsShellService: OsShellService }>;
  private _iframeId?: string;
  private _display = ShellDisplay.NONE;
  private _spaceKey?: PublicKey;

  constructor({
    shellSrc = DEFAULT_SRC,
    channel = SHELL_CHANNEL,
    timeout = 1000
  }: Partial<ShellControllerOptions> = {}) {
    this._params = { shellSrc, channel, timeout };
  }

  get display() {
    return this._display;
  }

  get spaceKey() {
    return this._spaceKey;
  }

  async setLayout(layout: ShellLayout) {
    await this._shellRpc?.rpc.OsShellService.setLayout({ layout });
  }

  /**
   * @internal
   */
  async _open(identityCreated: boolean) {
    const port = await this._getIFramePort(identityCreated);

    this._shellRpc = createProtoRpcPeer({
      requested: {
        OsShellService: schema.getService('dxos.iframe.OsShellService')
      },
      exposed: {
        OsAppService: schema.getService('dxos.iframe.OsAppService')
      },
      handlers: {
        OsAppService: {
          setDisplay: async ({ display }) => {
            const iframe = this._iframeId && document.getElementById(this._iframeId);
            if (!iframe) {
              return;
            }
            iframe.style.display = display ? 'block' : 'none';
            this._display = display;
          },
          setSpace: async ({ spaceKey }) => {
            this._spaceKey = spaceKey;
            this.spaceUpdate.emit(spaceKey);
          }
        }
      },
      port,
      timeout: this._params.timeout
    });

    await this._shellRpc.open();
  }

  /**
   * @internal
   */
  async _close() {
    await this._shellRpc?.close();
    this._shellRpc = undefined;
    if (this._iframeId) {
      document.getElementById(this._iframeId)?.remove();
      this._iframeId = undefined;
    }
  }

  private async _getIFramePort(identityCreated: boolean): Promise<RpcPort> {
    this._iframeId = `__DXOS_SHELL_${PublicKey.random().toHex()}__`;
    const source = new URL(this._params.shellSrc, window.location.origin);
    const iframe = createIFrame(source.toString(), this._iframeId, identityCreated);
    iframe.classList.add('__DXOS_SHELL');
    const res = await fetch(source);
    if (res.status >= 400) {
      throw new RemoteServiceConnectionTimeout();
    }
    return createIFramePort({ origin: source.origin, iframe, channel: this._params.channel });
  }
}
