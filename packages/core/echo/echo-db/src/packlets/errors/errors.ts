//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { ItemID } from '@dxos/protocols';

// TODO(burdon): Reconcile with @dxos/errors.

export class DBError extends Error {
  constructor(readonly code: string, message?: string, readonly context?: any) {
    super(message ? `${code}: ${message}` : code.toString());
    // NOTE: Restores prototype chain (https://stackoverflow.com/a/48342359).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class IdentityNotInitializedError extends DBError {
  constructor() {
    super('IDENTITY_NOT_INITIALIZED', 'Identity not initialized.');
  }
}

export class InvalidInvitationError extends DBError {
  constructor() {
    super('INVALID_INVITATION', 'Invitation is invalid.');
  }
}

export class InvalidStorageVersionError extends DBError {
  constructor(expected: number, actual: number) {
    super('INVALID_STORAGE_VERSION', 'Invalid storage version.', { expected, actual });
  }
}

export class SpaceNotFoundError extends DBError {
  constructor(spaceKey: PublicKey) {
    super('SPACE_NOT_FOUND', 'Space not found.', { spaceKey });
  }
}

export class EntityNotFoundError extends DBError {
  constructor(entityId: ItemID) {
    super('ENTITY_NOT_FOUND', 'Entity not found.', { entityId });
  }
}

export class UnknownModelError extends DBError {
  constructor(model: string) {
    super('UNKNOWN_MODEL', 'Unknown model.', { model });
  }
}
