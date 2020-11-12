//
// Copyright 2020 DXOS.org
//

import { SecretProvider, SecretValidator } from '@dxos/credentials';
export { SecretProvider, SecretValidator };

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
