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
export interface InvitationDetails {
  secretProvider: SecretProvider
  secretValidator: SecretValidator
}
