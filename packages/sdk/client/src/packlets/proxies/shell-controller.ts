//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { log } from '@dxos/log';
import { AppContextRequest, LayoutRequest, ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { appServiceBundle, shellServiceBundle, ShellServiceBundle } from '../client';

/**
 * Provide access to the shell via RPC connection.
 */
export class ShellController {
  readonly contextUpdate = new Event<AppContextRequest>();
  private _shellRpc?: ProtoRpcPeer<ShellServiceBundle>;
  private _display = ShellDisplay.NONE;

  constructor(private readonly _port: RpcPort) {}

  get display() {
    return this._display;
  }

  async setLayout(layout: ShellLayout, options: Omit<LayoutRequest, 'layout'> = {}) {
    log('set layout', { layout, ...options });
    this._display = ShellDisplay.FULLSCREEN;
    this.contextUpdate.emit({ display: this._display });
    await this._shellRpc?.rpc.ShellService.setLayout({ layout, ...options });
  }

  async open() {
    this._shellRpc = createProtoRpcPeer({
      requested: shellServiceBundle,
      exposed: appServiceBundle,
      handlers: {
        AppService: {
          setContext: async (request) => {
            log('set context', request);
            this._display = request.display;
            this.contextUpdate.emit(request);
          },
        },
      },
      port: this._port,
    });

    await this._shellRpc.open();
  }

  async close() {
    await this._shellRpc?.close();
    this._shellRpc = undefined;
  }
}
