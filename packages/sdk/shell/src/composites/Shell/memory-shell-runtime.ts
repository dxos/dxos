//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import {
  ShellLayout,
  type AppContextRequest,
  type InvitationUrlRequest,
  type LayoutRequest,
  type PublicKey,
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
    this._spaceKey = spaceKey;
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

  setLayout(request: LayoutRequest) {
    this._layout = request.layout;
    this._invitationCode = request.invitationCode;
    this._spaceKey = request.spaceKey;
    this.layoutUpdate.emit(request);
  }

  setInvitationUrl(request: InvitationUrlRequest) {
    this._invitationUrl = request.invitationUrl;
    this._deviceInvitationParam = request.deviceInvitationParam;
    this._spaceInvitationParam = request.spaceInvitationParam;
    this.invitationUrlUpdate.emit(request);
  }

  async setAppContext(context: AppContextRequest) {
    this.contextUpdate.emit(context);
  }
}
