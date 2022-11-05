//
// Copyright 2022 DXOS.org
//

import { InvitationWrapper } from './invitation-wrapper';

/**
 * Invitation that is being redeemed.
 * It works in non-interactive mode and requires no authentication.
 */
export class InvitationChallenge<T = void> {
  constructor(
    protected readonly _descriptor: InvitationWrapper,
    protected readonly _invitationPromise: Promise<T>,
    protected readonly _onAuthenticate: (secret: Uint8Array) => void
  ) {}

  toJSON() {
    return this.descriptor.toProto() as any;
  }

  get descriptor() {
    return this._descriptor;
  }

  // TODO(burdon): Change to async API that blocks here.
  authenticate(secret: Uint8Array) {
    this._onAuthenticate(secret);
  }

  /**
   * Wait for the invitation flow to complete.
   */
  wait(): Promise<T> {
    return this._invitationPromise;
  }
}
