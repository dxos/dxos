//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { DEFAULT_SHELL_CHANNEL, ShellServiceBundle, appServiceBundle, shellServiceBundle } from '@dxos/client-protocol';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AppContextRequest, LayoutRequest, ShellDisplay } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { IFrameManager } from './iframe-manager';

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
    private readonly _joinedSpace: Event<PublicKey>,
    private readonly _channel = DEFAULT_SHELL_CHANNEL
  ) {}

  get display() {
    return this._display;
  }

  async setLayout(request: LayoutRequest) {
    log('set layout', request);
    this._display = ShellDisplay.FULLSCREEN;
    this.contextUpdate.emit({ display: this._display });
    await this._shellRpc?.rpc.ShellService.setLayout(request);
  }

  async open() {
    await this._iframeManager.open();

    const iframe = this._iframeManager.iframe;
    iframe!.setAttribute('style', shellStyles);
    iframe!.setAttribute('data-testid', 'dxos-shell');
    this.contextUpdate.on(({ display, spaceKey }) => {
      iframe!.style.display = display === ShellDisplay.NONE ? 'none' : '';
      if (display === ShellDisplay.NONE) {
        iframe!.blur();
      }
      spaceKey && this._joinedSpace.emit(spaceKey);
    });

    const port = createIFramePort({
      origin: this._iframeManager.source.origin,
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
    await this._shellRpc?.close();
    this._shellRpc = undefined;
  }
}
