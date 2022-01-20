//
// Copyright 2022 DXOS.org
//

import { InvitationDescriptor } from '@dxos/echo-db';

/**
 * Invitation that is being redeemed.
 */
export class Invitation<T = void> {
  constructor (
    protected readonly _descriptor: InvitationDescriptor,
    protected readonly _invitationPromise: Promise<T>,
    protected readonly _onAuthenticate: (secret: Uint8Array) => void
  ) {}

  get descriptor () {
    return this._descriptor;
  }

  /**
   * Wait for the invitation flow to complete.
   */
  wait (): Promise<T> {
    return this._invitationPromise;
  }

  authenticate (secret: Uint8Array) {
    this._onAuthenticate(secret);
  }

  toJSON () {
    return this.descriptor.toProto();
  }
}
