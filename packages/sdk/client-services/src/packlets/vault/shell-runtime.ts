//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { appServiceBundle, type AppServiceBundle, type ShellRuntime, shellServiceBundle } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import {
  type AppContextRequest,
  type LayoutRequest,
  ShellLayout,
  type InvitationUrlRequest,
} from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, type ProtoRpcPeer, type RpcPort } from '@dxos/rpc';

/**
 * Endpoint that handles shell services.
 */
export class ShellRuntimeImpl implements ShellRuntime {
  readonly layoutUpdate = new Event<LayoutRequest>();
  readonly invitationUrlUpdate = new Event<InvitationUrlRequest>();

  private _appRpc?: ProtoRpcPeer<AppServiceBundle>;
  private _layout = ShellLayout.DEFAULT;
  private _spaceKey?: PublicKey;

  private _invitationCode?: string;
  private _invitationUrl? = typeof window !== 'undefined' ? window.location.origin : undefined;

  // TODO(burdon): Change to using underscores (coordinate with @dxos/web-auth).
  private _deviceInvitationParam = 'deviceInvitationCode'; // TODO(burdon): device_invitation_code
  private _spaceInvitationParam = 'spaceInvitationCode'; // TODO(burdon): space_invitation_code

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

  get invitationUrl() {
    return this._invitationUrl;
  }

  get deviceInvitationParam() {
    return this._deviceInvitationParam;
  }

  get spaceInvitationParam() {
    return this._spaceInvitationParam;
  }

  setLayout({ layout, invitationCode, spaceKey }: LayoutRequest) {
    this._layout = layout;
    this._invitationCode = invitationCode;
    this._spaceKey = spaceKey;
    this.layoutUpdate.emit({ layout, invitationCode, spaceKey });
  }

  setInvitationUrl({ invitationUrl, deviceInvitationParam, spaceInvitationParam }: InvitationUrlRequest) {
    this._invitationUrl = invitationUrl;
    this._deviceInvitationParam = deviceInvitationParam;
    this._spaceInvitationParam = spaceInvitationParam;
    this.invitationUrlUpdate.emit({ invitationUrl, deviceInvitationParam, spaceInvitationParam });
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
          setInvitationUrl: async (request) => {
            this._invitationUrl = request.invitationUrl;
            this._deviceInvitationParam = request.deviceInvitationParam;
            this._spaceInvitationParam = request.spaceInvitationParam;
            this.invitationUrlUpdate.emit(request);
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
