//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { DEFAULT_SHELL_CHANNEL, ShellServiceBundle, appServiceBundle, shellServiceBundle } from '@dxos/client-protocol';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AppContextRequest, LayoutRequest, ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';
import { Provider } from '@dxos/util';

import { IFrameController } from './iframe-controller';

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
export class ShellController {
  readonly contextUpdate = new Event<AppContextRequest>();
  private _shellRpc?: ProtoRpcPeer<ShellServiceBundle>;
  private _spaceProvider?: Provider<PublicKey | undefined>;
  private _display = ShellDisplay.NONE;

  // prettier-ignore
  constructor(
    private readonly _iframeController: IFrameController,
    private readonly _joinedSpace: Event<PublicKey>,
    private readonly _invalidatedInvitationCode: Event<string>,
    private readonly _channel = DEFAULT_SHELL_CHANNEL
  ) {
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  get display() {
    return this._display;
  }

  async setLayout(layout: ShellLayout, options: Omit<LayoutRequest, 'layout'> = {}) {
    log('set layout', { layout, ...options });
    this._display = ShellDisplay.FULLSCREEN;
    this.contextUpdate.emit({ display: this._display });
    await this._shellRpc?.rpc.ShellService.setLayout({ layout, ...options });
  }

  setSpaceProvider(provider: Provider<PublicKey | undefined>) {
    this._spaceProvider = provider;
  }

  async open() {
    await this._iframeController.open();

    const iframe = this._iframeController.iframe;
    iframe!.setAttribute('style', shellStyles);
    iframe!.setAttribute('data-testid', 'dxos-shell');
    this.contextUpdate.on(({ display, spaceKey }) => {
      iframe!.style.display = display === ShellDisplay.NONE ? 'none' : '';
      if (display === ShellDisplay.NONE) {
        iframe!.blur();
      }
      spaceKey && this._joinedSpace.emit(spaceKey);
    });
    this.contextUpdate.on(({ invalidatedInvitationCode }) => {
      invalidatedInvitationCode && this._invalidatedInvitationCode.emit(invalidatedInvitationCode);
    });

    window.addEventListener('keydown', this._handleKeyDown);

    const port = createIFramePort({
      origin: this._iframeController.source.origin,
      channel: this._channel,
      iframe: this._iframeController.iframe,
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

  private async _handleKeyDown(event: KeyboardEvent) {
    const modifier = event.ctrlKey || event.metaKey;
    if (event.key === '>' && event.shiftKey && modifier) {
      await this.setLayout(ShellLayout.DEVICE_INVITATIONS);
    } else if (event.key === '.' && modifier) {
      const spaceKey = await this._spaceProvider?.();
      if (spaceKey) {
        await this.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey });
      }
    }
  }
}
