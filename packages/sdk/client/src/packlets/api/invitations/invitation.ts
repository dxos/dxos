//
// Copyright 2022 DXOS.org
//

import { InvitationDescriptor } from '@dxos/echo-db';
import { InvitationDescriptor as InvitationDescriptorProto } from '@dxos/protocols/proto/dxos/echo/invitation';

/**
 * Invitation that is being redeemed.
 * It works in non-interactive mode and requires no authentication.
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

  // TODO(burdon): Change to async API that blocks here.
  authenticate (secret: Uint8Array) {
    this._onAuthenticate(secret);
  }

  /**
   * Wait for the invitation flow to complete.
   */
  wait (): Promise<T> {
    return this._invitationPromise;
  }

  toJSON (): InvitationDescriptorProto {
    return this.descriptor.toProto();
  }
}
