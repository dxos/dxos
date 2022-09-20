//
// Copyright 2021 DXOS.org
//

import { DXOSError } from '@dxos/debug';
import { ItemID } from '@dxos/echo-protocol';
import { PublicKey } from '@dxos/keys';

export class PartyNotFoundError extends DXOSError {
  constructor (partyKey: PublicKey) {
    super('PARTY_NOT_FOUND', `Party with key not found: ${partyKey}`);
  }
}

export class EntityNotFoundError extends DXOSError {
  constructor (entityId: ItemID) {
    super('ENTITY_NOT_FOUND', `Entitiy not found: ${entityId}`);
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

export class InvalidStorageVersionError extends DXOSError {
  constructor (expected: number, actual: number) {
    super('INVALID_STORAGE_VERSION', `Invalid storage version: Expected ${expected}, actual ${actual}.`);
  }
}
