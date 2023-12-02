//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { appServiceBundle, type AppServiceBundle, type ShellRuntime, shellServiceBundle } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { type AppContextRequest, type LayoutRequest, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, type ProtoRpcPeer, type RpcPort } from '@dxos/rpc';

/**
 * Endpoint that handles shell services.
 */
export class ShellRuntimeImpl implements ShellRuntime {
  readonly layoutUpdate = new Event<LayoutRequest>();
  private _appRpc?: ProtoRpcPeer<AppServiceBundle>;
  private _layout = ShellLayout.DEFAULT;
  private _invitationCode?: string;
  private _spaceKey?: PublicKey;

  constructor(private readonly _port: RpcPort) {}

  get layout() {
    return this._layout;
  }

  get invitationCode() {
    return this._invitationCode;
  }

  get spaceKey() {
    return this._spaceKey;
  }

  setLayout({ layout, invitationCode, spaceKey }: LayoutRequest) {
    this._layout = layout;
    this._invitationCode = invitationCode;
    this._spaceKey = spaceKey;
    this.layoutUpdate.emit({ layout, invitationCode, spaceKey });
  }

  async setAppContext(context: AppContextRequest) {
    invariant(this._appRpc, 'runtime not open');

    await this._appRpc.rpc.AppService.setContext(context);
  }

  async open() {
    this._appRpc = createProtoRpcPeer({
      requested: appServiceBundle,
      exposed: shellServiceBundle,
      handlers: {
        ShellService: {
          setLayout: async (request) => {
            this._layout = request.layout;
            this._invitationCode = request.invitationCode;
            this._spaceKey = request.spaceKey;
            this.layoutUpdate.emit(request);
          },
        },
      },
      port: this._port,
    });

    await this._appRpc.open();
  }

  async close() {
    await this._appRpc?.close();
    this._appRpc = undefined;
  }
}
