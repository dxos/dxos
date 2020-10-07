//
// Copyright 2020 DXOS.org
//

import { InvitationDescriptor } from './invitation-descriptor';

/**
 * Provides a shared secret during an invitation process.
 */
export type SecretProvider = (info: any) => Promise<Buffer>;

/**
 * Validates the shared secret during an invitation process.
 */
export type SecretValidator = (invitation: InvitationDescriptor, secret: Buffer) => Promise<boolean>;

/**
 * Defines a way for peers to authenticate each other through a side channel.
 */
export interface InvitationAuthenticator {
  secretProvider?: SecretProvider
  secretValidator: SecretValidator
}

/**
 * Additional set of callbacks and options used in the invitation process.
 */
export interface InvitationOptions {
  /**
   * A function to be called when the invitation is closed (successfully or not).
   */
  onFinish?: () => void

  /**
   * Date.now()-style timestamp of when this invitation should expire.
   */
  expiration?: number
}
