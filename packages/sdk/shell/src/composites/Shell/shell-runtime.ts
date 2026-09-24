//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { EmptySchema } from '@bufbuild/protobuf/wkt';

import { Event } from '@dxos/async';
import { type AppServiceBundle, type ShellRuntime, appServiceBundle, shellServiceBundle } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { toPublicKey } from '@dxos/protocols/buf';
import {
  type AppContextRequest,
  type InvitationUrlRequest,
  InvitationUrlRequestSchema,
  type LayoutRequest,
  LayoutRequestSchema,
  ShellLayout,
} from '@dxos/protocols/buf/dxos/iframe_pb';
import { type ProtoRpcPeer, type RpcPort, createProtoRpcPeer } from '@dxos/rpc';

/**
 * Endpoint that handles shell services.
 */
export class ShellRuntimeImpl implements ShellRuntime {
  readonly layoutUpdate = new Event<LayoutRequest>();
  readonly invitationUrlUpdate = new Event<InvitationUrlRequest>();

  private _appRpc?: ProtoRpcPeer<AppServiceBundle>;
  private _layout = ShellLayout.DEFAULT;
  private _spaceKey?: PublicKey;
  private _spaceId?: string;

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

  /** @deprecated Use spaceId. */
  get spaceKey() {
    return this._spaceKey;
  }

  get spaceId() {
    return this._spaceId;
  }

  get invitationUrl() {
    return this._invitationUrl!;
  }

  get deviceInvitationParam() {
    return this._deviceInvitationParam;
  }

  get spaceInvitationParam() {
    return this._spaceInvitationParam;
  }

  setLayout({ layout, invitationCode, spaceKey, spaceId }: LayoutRequest): void {
    this._layout = layout;
    this._invitationCode = invitationCode;
    this._spaceKey = toPublicKey(spaceKey);
    this._spaceId = spaceId;
    this.layoutUpdate.emit(create(LayoutRequestSchema, { layout, invitationCode, spaceKey, spaceId }));
  }

  setInvitationUrl({ invitationUrl, deviceInvitationParam, spaceInvitationParam }: InvitationUrlRequest): void {
    this._invitationUrl = invitationUrl;
    this._deviceInvitationParam = deviceInvitationParam;
    this._spaceInvitationParam = spaceInvitationParam;
    this.invitationUrlUpdate.emit(
      create(InvitationUrlRequestSchema, { invitationUrl, deviceInvitationParam, spaceInvitationParam }),
    );
  }

  async setAppContext(context: AppContextRequest): Promise<void> {
    invariant(this._appRpc, 'runtime not open');

    await this._appRpc.rpc.AppService.setContext(context);
  }

  async open(): Promise<void> {
    this._appRpc = createProtoRpcPeer({
      requested: appServiceBundle,
      exposed: shellServiceBundle,
      handlers: {
        ShellService: {
          setLayout: async (request) => {
            this._layout = request.layout;
            this._invitationCode = request.invitationCode;
            this._spaceKey = toPublicKey(request.spaceKey);
            this._spaceId = request.spaceId;
            this.layoutUpdate.emit(request);
            return create(EmptySchema);
          },
          setInvitationUrl: async (request) => {
            this._invitationUrl = request.invitationUrl;
            this._deviceInvitationParam = request.deviceInvitationParam;
            this._spaceInvitationParam = request.spaceInvitationParam;
            this.invitationUrlUpdate.emit(request);
            return create(EmptySchema);
          },
        },
      },
      port: this._port,
    });

    await this._appRpc.open();
  }

  async close(): Promise<void> {
    await this._appRpc?.close();
    this._appRpc = undefined;
  }
}
