//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { DXOSError } from '@dxos/debug';

export class PartyNotFoundError extends DXOSError {
  constructor (partyKey: PublicKey) {
    super('PARTY_NOT_FOUND', `Party with key ${partyKey} not found.`);
  }
}

export class UnknownModelError extends DXOSError {
  constructor (model: string) {
    super('UNKNOWN_MODEL', `Unknown model ${model}.`);
  }
}

export class IdentityNotInitializedError extends DXOSError {
  constructor () {
    super('IDENTITY_NOT_INITIALIZED', 'Identity not initialized.');
  }
}

export class InvalidInvitationError extends DXOSError {
  constructor () {
    super('INVALID_INVITATION', 'Invitation is invalid.');
  }
}
