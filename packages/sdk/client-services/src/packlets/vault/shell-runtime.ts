//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { AppContextRequest, LayoutRequest, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { AppServiceBundle, appServiceBundle, shellServiceBundle } from './services';

/**
 * Endpoint that handles shell services.
 */
export class ShellRuntime {
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

  setLayout(layout: ShellLayout, options: Omit<LayoutRequest, 'layout'> = {}) {
    this._layout = layout;
    this._invitationCode = options.invitationCode;
    this._spaceKey = options.spaceKey;
    this.layoutUpdate.emit({ layout, ...options });
  }

  async setAppContext(request: AppContextRequest) {
    if (request.spaceKey) {
      this._spaceKey = request.spaceKey;
    }

    if (request.invitationCode) {
      this._invitationCode = request.invitationCode;
    }

    await this._appRpc?.rpc.AppService.setContext({
      ...request,
      spaceKey: this._spaceKey,
      invitationCode: this._invitationCode
    });
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
