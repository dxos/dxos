//
// Copyright 2021 DXOS.org
//

import { DXOSError } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { ItemID } from '@dxos/protocols';

// TODO(burdon): Move error to core protocols.

export class IdentityNotInitializedError extends DXOSError {
  constructor() {
    super('IDENTITY_NOT_INITIALIZED', 'Identity not initialized.');
  }
}

export class InvalidInvitationError extends DXOSError {
  constructor() {
    super('INVALID_INVITATION', 'Invitation is invalid.');
  }
}

export class InvalidStorageVersionError extends DXOSError {
  constructor(expected: number, actual: number) {
    super('INVALID_STORAGE_VERSION', 'Invalid storage version.', { expected, actual });
  }
}

export class SpaceNotFoundError extends DXOSError {
  constructor(spaceKey: PublicKey) {
    super('SPACE_NOT_FOUND', 'Space not found.', { spaceKey });
  }
}

export class EntityNotFoundError extends DXOSError {
  constructor(entityId: ItemID) {
    super('ENTITY_NOT_FOUND', 'Entity not found.', { entityId });
  }
}

export class UnknownModelError extends DXOSError {
  constructor(model: string) {
    super('UNKNOWN_MODEL', 'Unknown model.', { model });
  }
}
