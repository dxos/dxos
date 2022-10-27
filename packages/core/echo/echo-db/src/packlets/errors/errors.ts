//
// Copyright 2021 DXOS.org
//

import { DXOSError } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { ItemID } from '@dxos/protocols';

// TODO(burdon): Move to halo.
export class IdentityNotInitializedError extends DXOSError {
  constructor() {
    super('IDENTITY_NOT_INITIALIZED', 'Identity not initialized.');
  }
}

// TODO(burdon): Move to halo.
export class InvalidInvitationError extends DXOSError {
  constructor() {
    super('INVALID_INVITATION', 'Invitation is invalid.');
  }
}

export class InvalidStorageVersionError extends DXOSError {
  constructor(expected: number, actual: number) {
    super('INVALID_STORAGE_VERSION', `Invalid storage version: Expected ${expected}, actual ${actual}.`);
  }
}

export class SpaceNotFoundError extends DXOSError {
  constructor(partyKey: PublicKey) {
    super('PARTY_NOT_FOUND', `Space not found: ${partyKey}`);
  }
}

export class EntityNotFoundError extends DXOSError {
  constructor(entityId: ItemID) {
    super('ENTITY_NOT_FOUND', `Entitiy not found: ${entityId}`);
  }
}

export class UnknownModelError extends DXOSError {
  constructor(model: string) {
    super('UNKNOWN_MODEL', `Unknown model ${model}.`);
  }
}
