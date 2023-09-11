//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { AppContextRequest, LayoutRequest, PublicKey, ShellLayout, ShellRuntime } from '@dxos/react-client';

// TODO(wittjosiah): Remove?
export class MemoryShellRuntime implements ShellRuntime {
  readonly layoutUpdate = new Event<LayoutRequest>();
  readonly contextUpdate = new Event<AppContextRequest>();
  private _layout: ShellLayout;
  private _invitationCode?: string;
  private _spaceKey?: PublicKey;

  constructor({ layout, invitationCode, spaceKey }: Partial<LayoutRequest> & Partial<AppContextRequest> = {}) {
    this._layout = layout ?? ShellLayout.DEFAULT;
    this._invitationCode = invitationCode;
    this._spaceKey = spaceKey;
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

  setLayout(request: LayoutRequest) {
    this._layout = request.layout;
    this._invitationCode = request.invitationCode;
    this._spaceKey = request.spaceKey;
    this.layoutUpdate.emit(request);
  }

  async setAppContext(context: AppContextRequest) {
    this.contextUpdate.emit(context);
  }
}
