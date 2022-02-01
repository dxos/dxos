//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { DXOSError } from '@dxos/debug';
import { ItemID } from '@dxos/echo-protocol';

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

// TODO(dmaretskyi): Rename to InvalidStateError.
export class EchoNotOpenError extends DXOSError {
  constructor () {
    super('ECHO_NOT_OPEN', 'ECHO not open.');
  }
}

export class InvalidStoredDataError extends DXOSError {
  constructor (message = 'unknown reason') {
    super('INVALID_STORED_DATA', `Stored data is invalid: ${message}`);
  }
}
