//
// Copyright 2022 DXOS.org
//

import { InvitationDescriptor, InvitationDescriptorType } from '@dxos/echo-db';
import { assert } from 'console';

/**
 * Invitation that is being redeemed.
 * It works in non-interactive mode and requires no authentication.
 */
export class Invitation<T = void> {
  constructor (
    protected readonly _descriptor: InvitationDescriptor,
    protected readonly _invitationPromise: Promise<T>
  ) {
    assert(_descriptor.type === InvitationDescriptorType.OFFLINE, 'Interactive invitation should be used with `AuthenticatedInvitation` class.');
  }

  get descriptor () {
    return this._descriptor;
  }

  /**
   * Wait for the invitation flow to complete.
   */
  wait (): Promise<T> {
    return this._invitationPromise;
  }

  toJSON () {
    return this.descriptor.toProto();
  }
}

/**
 * Invitation that is being redeemed.
 * It works in interactive mode and requires authentication.
 */
 export class AuthenticatedInvitation<T = void> extends Invitation<T> {
  constructor (
    _descriptor: InvitationDescriptor,
    _invitationPromise: Promise<T>,
    protected readonly _onAuthenticate: (secret: Uint8Array) => void
  ) {
    super(_descriptor, _invitationPromise);
  }

  authenticate (secret: Uint8Array) {
    this._onAuthenticate(secret);
  }
}