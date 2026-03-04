//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { decodePublicKey } from '@dxos/protocols/buf';
import {
  type AppContextRequest,
  type InvitationUrlRequest,
  type LayoutRequest,
  ShellLayout,
  type ShellRuntime,
} from '@dxos/react-client';

// TODO(wittjosiah): Remove?
export class MemoryShellRuntime implements ShellRuntime {
  readonly layoutUpdate = new Event<LayoutRequest>();
  readonly invitationUrlUpdate = new Event<InvitationUrlRequest>();
  readonly contextUpdate = new Event<AppContextRequest>();
  private _layout: ShellLayout;
  private _invitationCode?: string;
  private _spaceKey?: PublicKey;
  private _invitationUrl: string;
  private _deviceInvitationParam: string;
  private _spaceInvitationParam: string;

  constructor({
    layout,
    invitationCode,
    spaceKey,
    invitationUrl,
    deviceInvitationParam,
    spaceInvitationParam,
  }: Partial<LayoutRequest> & Partial<AppContextRequest> & Partial<InvitationUrlRequest> = {}) {
    this._layout = layout ?? ShellLayout.DEFAULT;
    this._invitationCode = invitationCode;
    this._spaceKey = spaceKey
      ? '$typeName' in (spaceKey as object)
        ? decodePublicKey(spaceKey as Parameters<typeof decodePublicKey>[0])
        : (spaceKey as unknown as PublicKey)
      : undefined;
    this._invitationUrl = invitationUrl ?? window.location.origin;
    this._deviceInvitationParam = deviceInvitationParam ?? 'deviceInvitationCode';
    this._spaceInvitationParam = spaceInvitationParam ?? 'spaceInvitationCode';
  }

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

  setLayout(request: LayoutRequest): void {
    this._layout = request.layout;
    this._invitationCode = request.invitationCode;
    const sk = request.spaceKey;
    this._spaceKey = sk
      ? '$typeName' in (sk as object)
        ? decodePublicKey(sk as Parameters<typeof decodePublicKey>[0])
        : (sk as unknown as PublicKey)
      : undefined;
    this.layoutUpdate.emit(request);
  }

  setInvitationUrl(request: InvitationUrlRequest): void {
    this._invitationUrl = request.invitationUrl;
    this._deviceInvitationParam = request.deviceInvitationParam;
    this._spaceInvitationParam = request.spaceInvitationParam;
    this.invitationUrlUpdate.emit(request);
  }

  async setAppContext(context: AppContextRequest): Promise<void> {
    this.contextUpdate.emit(context);
  }
}
