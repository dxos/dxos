//
// Copyright 2020 DXOS.org
//

import { SecretProvider, SecretValidator, defaultSecretProvider, defaultSecretValidator } from '@dxos/credentials';

/**
 * Defines a way for peers to authenticate each other through a side channel.
 */
export interface InvitationAuthenticator {
  secretProvider?: SecretProvider
  secretValidator: SecretValidator
}

export const defaultInvitationAuthenticator: Required<InvitationAuthenticator> = {
  secretProvider: defaultSecretProvider,
  secretValidator: defaultSecretValidator
};

/**
 * Additional set of callbacks and options used in the invitation process.
 */
export interface InvitationOptions {
  /**
   * A function to be called when the invitation is closed (successfully or not).
   */
  onFinish?: ({ expired }: { expired?: boolean }) => void

  /**
   * Date.now()-style timestamp of when this invitation should expire.
   */
  expiration?: number
}
