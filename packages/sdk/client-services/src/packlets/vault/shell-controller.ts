//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { appServiceBundle, shellServiceBundle, ShellServiceBundle } from './services';

/**
 * Provide access to the shell via RPC connection.
 */
export class ShellController {
  readonly displayUpdate = new Event<ShellDisplay>();
  readonly spaceUpdate = new Event<PublicKey>();
  private _shellRpc?: ProtoRpcPeer<ShellServiceBundle>;
  private _display = ShellDisplay.NONE;
  private _spaceKey?: PublicKey;

  constructor(private readonly _port: RpcPort) {}

  get display() {
    return this._display;
  }

  get spaceKey() {
    return this._spaceKey;
  }

  async setLayout(layout: ShellLayout) {
    this._display = ShellDisplay.FULLSCREEN;
    this.displayUpdate.emit(this._display);
    await this._shellRpc?.rpc.ShellService.setLayout({ layout });
  }

  async open() {
    this._shellRpc = createProtoRpcPeer({
      requested: shellServiceBundle,
      exposed: appServiceBundle,
      handlers: {
        AppService: {
          setDisplay: async ({ display }) => {
            this._display = display;
            this.displayUpdate.emit(this._display);
          },
          setSpace: async ({ spaceKey }) => {
            this._spaceKey = spaceKey;
            this.spaceUpdate.emit(this._spaceKey);
          }
        }
      },
      port: this._port
    });

    await this._shellRpc.open();
  }

  async close() {
    await this._shellRpc?.close();
    this._shellRpc = undefined;
  }
}
