//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { AppContextRequest, LayoutRequest, PublicKey, ShellLayout, ShellRuntime } from '@dxos/react-client';

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

  setLayout(layout: ShellLayout, options: Omit<LayoutRequest, 'layout'> = {}) {
    this._layout = layout;
    this._invitationCode = options.invitationCode;
    this._spaceKey = options.spaceKey;
    this.layoutUpdate.emit({ layout, ...options });
  }

  async setAppContext(context: AppContextRequest) {
    this.contextUpdate.emit(context);
  }
}
