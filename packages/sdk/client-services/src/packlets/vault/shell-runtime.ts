//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { AppServiceBundle, appServiceBundle, shellServiceBundle } from './services';

export class ShellRuntime {
  readonly layoutUpdate = new Event<ShellLayout>();
  private _appRpc?: ProtoRpcPeer<AppServiceBundle>;
  private _layout = ShellLayout.DEFAULT;

  constructor(private readonly _port: RpcPort) {}

  get layout() {
    return this._layout;
  }

  async setDisplay(display: ShellDisplay) {
    await this._appRpc?.rpc.AppService.setDisplay({ display });
  }

  async setSpace(spaceKey: PublicKey) {
    await this._appRpc?.rpc.AppService.setSpace({ spaceKey });
  }

  async open() {
    this._appRpc = createProtoRpcPeer({
      requested: appServiceBundle,
      exposed: shellServiceBundle,
      handlers: {
        ShellService: {
          setLayout: async ({ layout }) => {
            this._layout = layout;
            this.layoutUpdate.emit(layout);
          }
        }
      },
      port: this._port
    });

    await this._appRpc.open();
  }

  async close() {
    await this._appRpc?.close();
    this._appRpc = undefined;
  }
}
