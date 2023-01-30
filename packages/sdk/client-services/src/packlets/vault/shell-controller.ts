//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AppContextRequest, LayoutRequest, ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { appServiceBundle, shellServiceBundle, ShellServiceBundle } from './services';

/**
 * Provide access to the shell via RPC connection.
 */
export class ShellController {
  readonly contextUpdate = new Event<AppContextRequest>();
  private _shellRpc?: ProtoRpcPeer<ShellServiceBundle>;
  private _display = ShellDisplay.NONE;
  private _spaceKey?: PublicKey;
  private _invitationCode?: string;

  constructor(private readonly _port: RpcPort) {}

  get display() {
    return this._display;
  }

  get spaceKey() {
    return this._spaceKey;
  }

  setSpace(key?: PublicKey) {
    this._spaceKey = key;
    this._emitUpdate();
  }

  async setLayout(layout: ShellLayout, options: Omit<LayoutRequest, 'layout'> = {}) {
    this._display = ShellDisplay.FULLSCREEN;
    this._emitUpdate();
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
            this._spaceKey = request.spaceKey;
            this._invitationCode = request.invitationCode;
            this.contextUpdate.emit(request);
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

  private _emitUpdate() {
    this.contextUpdate.emit({
      display: this._display,
      spaceKey: this._spaceKey,
      invitationCode: this._invitationCode
    });
  }
}
