//
// Copyright 2021 DXOS.org
//

import type { PublicKey } from '@dxos/keys';

import type { ItemID } from '../types';

/**
 * NOTE: Messages should be sentences (Start with a capital letter and end with a period).
 * Errors can optionally include a JSON context object.
 */
class BaseError extends Error {
  constructor(
    readonly code: string,
    message?: string,
    readonly context?: Record<string, any>,
  ) {
    super(message ?? code);
    this.name = code;
    // NOTE: Restores prototype chain (https://stackoverflow.com/a/48342359).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * User facing API Errors.
 * E.g., something was misconfigured.
 */
export class ApiError extends BaseError {}

/**
 * Internal system errors.
 * E.g., unexpected/unrecoverable runtime error.
 */
export class SystemError extends BaseError {}

/**
 * Database errors.
 */
// TODO(wittjosiah): Same as ApiError?
export class DatabaseError extends BaseError {}

/**
 * Thrown when request was terminated because the RPC endpoint has been closed.
 */
export class RpcClosedError extends SystemError {
  constructor() {
    super('RPC_CLOSED', 'Request was terminated because the RPC endpoint is closed.');
  }
}

/**
 * Thrown when `request` is called when RPC has not been opened.
 */
export class RpcNotOpenError extends SystemError {
  constructor() {
    super('RPC_NOT_OPEN', 'RPC has not been opened.');
  }
}

export class CancelledError extends SystemError {
  constructor(message?: string, context?: Record<string, any>) {
    super('CANCELLED', message, context);
  }
}

export class InvalidConfigError extends ApiError {
  constructor(message?: string, context?: Record<string, any>) {
    super('INVALID_CONFIG', message, context);
  }
}

/**
 * Explicit failure to connect with remote client services.
 */
export class RemoteServiceConnectionError extends ApiError {
  constructor(message?: string, context?: Record<string, any>) {
    super('REMOTE_SERVICE_CONNECTION_ERROR', message, context);
  }
}

/**
 * Failed to open a connection to remote client services.
 */
export class RemoteServiceConnectionTimeout extends ApiError {
  constructor(message?: string, context?: Record<string, any>) {
    super('REMOTE_SERVICE_CONNECTION_TIMEOUT', message, context);
  }
}

export class DataCorruptionError extends SystemError {
  constructor(message?: string, context?: Record<string, any>) {
    super('DATA_CORRUPTION', message, context);
  }
}

export class InvalidInvitationExtensionRoleError extends SystemError {
  constructor(message?: string, context?: Record<string, any>) {
    super('INVALID_INVITATION_EXTENSION_ROLE', message, context);
  }
}

export class IdentityNotInitializedError extends DatabaseError {
  constructor(message?: string, context?: Record<string, any>) {
    super('IDENTITY_NOT_INITIALIZED', message, context);
  }
}

export class InvalidInvitationError extends DatabaseError {
  constructor(message?: string, context?: Record<string, any>) {
    super('INVALID_INVITATION', message, context);
  }
}

export class ConnectionResetError extends BaseError {
  constructor(message?: string, context?: any) {
    super('CONNECTION_RESET', message, context);
  }
}

export class TimeoutError extends BaseError {
  constructor(message?: string, context?: any) {
    super('TIMEOUT', message, context);
  }
}

// General protocol error
export class ProtocolError extends BaseError {
  constructor(message?: string, context?: any) {
    super('PROTOCOL_ERROR', message, context);
  }
}

// General connectivity errors
export class ConnectivityError extends BaseError {
  constructor(message?: string, context?: any) {
    super('CONNECTIVITY_ERROR', message, context);
  }
}

// TODO(nf): Rename? the protocol isn't what's unknown...
export class UnknownProtocolError extends BaseError {
  constructor(message?: string, innerError?: Error) {
    super('UNKNOWN_PROTOCOL_ERROR', message, innerError);
  }
}
export class InvalidStorageVersionError extends DatabaseError {
  constructor(expected: number, actual: number) {
    super('INVALID_STORAGE_VERSION', 'Invalid storage version.', { expected, actual });
  }
}

export class SpaceNotFoundError extends DatabaseError {
  constructor(spaceKey: PublicKey) {
    super('SPACE_NOT_FOUND', 'Space not found.', { spaceKey });
  }
}

export class EntityNotFoundError extends DatabaseError {
  constructor(entityId: ItemID) {
    super('ITEM_NOT_FOUND', 'Item not found.', { entityId });
  }
}

export class UnknownModelError extends DatabaseError {
  constructor(model: string) {
    super('UNKNOWN_MODEL', 'Unknown model.', { model });
  }
}
