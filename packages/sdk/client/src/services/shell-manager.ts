//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import {
  DEFAULT_SHELL_CHANNEL,
  type ShellServiceBundle,
  appServiceBundle,
  shellServiceBundle,
} from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import {
  type AppContextRequest,
  type LayoutRequest,
  ShellDisplay,
  type InvitationUrlRequest,
} from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { type IFrameManager } from './iframe-manager';
import { RPC_TIMEOUT } from '../common';

const shellStyles = Object.entries({
  display: 'none',
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  border: 0,
  'z-index': 60,
}).reduce((acc, [key, value]) => `${acc}${key}: ${value};`, '');

/**
 * Provide access to the shell via RPC connection.
 */
export class ShellManager {
  readonly contextUpdate = new Event<AppContextRequest>();

  private _shellRpc?: ProtoRpcPeer<ShellServiceBundle>;
  private _display = ShellDisplay.NONE;

  // prettier-ignore
  constructor(
    private readonly _iframeManager: IFrameManager,
    private readonly _channel = DEFAULT_SHELL_CHANNEL,
  ) {}

  get display() {
    return this._display;
  }

  async setLayout(request: LayoutRequest) {
    invariant(this._shellRpc, 'ShellManager not open');
    log('set layout', request);
    this._display = ShellDisplay.FULLSCREEN;
    this.contextUpdate.emit({ display: this._display });
    await this._shellRpc.rpc.ShellService.setLayout(request, { timeout: RPC_TIMEOUT });
  }

  async setInvitationUrl(request: InvitationUrlRequest) {
    log('set invitation url', request);
    await this._shellRpc?.rpc.ShellService.setInvitationUrl(request, { timeout: RPC_TIMEOUT });
  }

  async open() {
    if (this._shellRpc) {
      return;
    }

    await this._iframeManager.open();

    const iframe = this._iframeManager.iframe;
    iframe!.setAttribute('style', shellStyles);
    iframe!.setAttribute('name', 'dxos-shell');
    iframe!.setAttribute('data-testid', 'dxos-shell');
    this.contextUpdate.on(({ display, reload }) => {
      if (reload) {
        window.location.reload();
      }

      iframe!.style.display = display === ShellDisplay.NONE ? 'none' : '';
      if (display === ShellDisplay.NONE) {
        iframe!.blur();
      }
    });

    // TODO(wittjosiah): Remove. Workaround for socket runtime bug.
    //   https://github.com/socketsupply/socket/issues/893
    const origin =
      this._iframeManager.source.origin === 'null'
        ? this._iframeManager.source.toString().split('/').slice(0, 3).join('/')
        : this._iframeManager.source.origin;

    const port = createIFramePort({
      origin,
      channel: this._channel,
      iframe: this._iframeManager.iframe,
    });

    this._shellRpc = createProtoRpcPeer({
      requested: shellServiceBundle,
      exposed: appServiceBundle,
      handlers: {
        AppService: {
          setContext: async (request) => {
            log('set context', request);
            if (request.display) {
              this._display = request.display;
            }
            this.contextUpdate.emit(request);
          },
        },
      },
      port,
    });

    await this._shellRpc.open();
  }

  async close() {
    if (!this._shellRpc) {
      return;
    }

    await this._shellRpc?.close();
    this._shellRpc = undefined;
  }
}
