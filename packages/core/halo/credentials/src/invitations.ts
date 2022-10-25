//
// Copyright 2019 DXOS.org
//

/**
 * Info required for offline invitations.
 */
// TODO(burdon): Define types.
export interface SecretInfo {
  id: any;
  authNonce: any;
}

/**
 * Provides a shared secret during an invitation process.
 */
export type SecretProvider = (info?: SecretInfo) => Promise<Buffer>;

/**
 * Validates the shared secret during an invitation process.
 */
export type SecretValidator = (
  invitation: never,
  secret: Buffer
) => Promise<boolean>;

export const defaultSecretProvider: SecretProvider = async () =>
  Buffer.from('0000');

export const defaultSecretValidator: SecretValidator = async (
  invitation,
  secret
) => true;
