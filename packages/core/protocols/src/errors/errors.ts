//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { ApiError, BaseError, DatabaseError, SystemError } from './base-errors';
import { registerError, registerErrorMessageContext, registerErrorNoArgs } from './helpers';
import type { ObjectId } from '../types';

/**
 * Thrown when request was terminated because the RPC endpoint has been closed.
 */
export class RpcClosedError extends SystemError {
  constructor() {
    super('RPC_CLOSED', 'Request was terminated because the RPC endpoint is closed.');
  }
}

registerErrorNoArgs('RPC_CLOSED', RpcClosedError);

/**
 * Thrown when `request` is called when RPC has not been opened.
 */
export class RpcNotOpenError extends SystemError {
  constructor() {
    super('RPC_NOT_OPEN', 'RPC has not been opened.');
  }
}

registerErrorNoArgs('RPC_NOT_OPEN', RpcNotOpenError);

export class CancelledError extends SystemError {
  constructor(message?: string, context?: Record<string, any>) {
    super('CANCELLED', message, context);
  }
}

registerErrorMessageContext('CANCELLED', CancelledError);

export class InvalidConfigError extends ApiError {
  constructor(message?: string, context?: Record<string, any>) {
    super('INVALID_CONFIG', message, context);
  }
}

registerErrorMessageContext('INVALID_CONFIG', InvalidConfigError);

/**
 * Explicit failure to connect with remote client services.
 */
export class RemoteServiceConnectionError extends ApiError {
  constructor(message?: string, context?: Record<string, any>) {
    super('REMOTE_SERVICE_CONNECTION_ERROR', message, context);
  }
}

registerErrorMessageContext('REMOTE_SERVICE_CONNECTION_ERROR', RemoteServiceConnectionError);

/**
 * Failed to open a connection to remote client services.
 */
export class RemoteServiceConnectionTimeout extends ApiError {
  constructor(message?: string, context?: Record<string, any>) {
    super('REMOTE_SERVICE_CONNECTION_TIMEOUT', message, context);
  }
}

registerErrorMessageContext('REMOTE_SERVICE_CONNECTION_TIMEOUT', RemoteServiceConnectionTimeout);

export class DataCorruptionError extends SystemError {
  constructor(message?: string, context?: Record<string, any>) {
    super('DATA_CORRUPTION', message, context);
  }
}

registerErrorMessageContext('DATA_CORRUPTION', DataCorruptionError);

export class InvalidInvitationExtensionRoleError extends SystemError {
  constructor(message?: string, context?: Record<string, any>) {
    super('INVALID_INVITATION_EXTENSION_ROLE', message, context);
  }
}

registerErrorMessageContext('INVALID_INVITATION_EXTENSION_ROLE', InvalidInvitationExtensionRoleError);

export class IdentityNotInitializedError extends DatabaseError {
  constructor(message?: string, context?: Record<string, any>) {
    super('IDENTITY_NOT_INITIALIZED', message, context);
  }
}

registerErrorMessageContext('IDENTITY_NOT_INITIALIZED', IdentityNotInitializedError);

export class InvalidInvitationError extends DatabaseError {
  constructor(message?: string, context?: Record<string, any>) {
    super('INVALID_INVITATION', message, context);
  }
}

registerErrorMessageContext('INVALID_INVITATION', InvalidInvitationError);

export class AlreadyJoinedError extends DatabaseError {
  constructor(message?: string, context?: Record<string, any>) {
    super('ALREADY_JOINED', message, context);
  }
}

registerErrorMessageContext('ALREADY_JOINED', AlreadyJoinedError);

export class ConnectionResetError extends BaseError {
  constructor(message?: string, context?: any) {
    super('CONNECTION_RESET', message, context);
  }
}

registerErrorMessageContext('CONNECTION_RESET', ConnectionResetError);

export class TimeoutError extends BaseError {
  constructor(message?: string, context?: any) {
    super('TIMEOUT', message, context);
  }
}

registerErrorMessageContext('TIMEOUT', TimeoutError);

// General protocol error.
export class ProtocolError extends BaseError {
  constructor(message?: string, context?: any) {
    super('PROTOCOL_ERROR', message, context);
  }
}

registerErrorMessageContext('PROTOCOL_ERROR', ProtocolError);

// General connectivity errors.
export class ConnectivityError extends BaseError {
  constructor(message?: string, context?: any) {
    super('CONNECTIVITY_ERROR', message, context);
  }
}

registerErrorMessageContext('CONNECTIVITY_ERROR', ConnectivityError);

export class RateLimitExceededError extends BaseError {
  constructor(message?: string, context?: any) {
    super('RATE_LIMIT_EXCEEDED', message, context);
  }
}

registerErrorMessageContext('RATE_LIMIT_EXCEEDED', RateLimitExceededError);

// TODO(nf): Rename? the protocol isn't what's unknown...
export class UnknownProtocolError extends BaseError {
  constructor(message?: string, innerError?: Error) {
    super('UNKNOWN_PROTOCOL_ERROR', message, innerError);
  }
}

registerErrorMessageContext('UNKNOWN_PROTOCOL_ERROR', UnknownProtocolError);

export class InvalidStorageVersionError extends DatabaseError {
  constructor(expected: number, actual: number) {
    super('INVALID_STORAGE_VERSION', 'Invalid storage version.', { expected, actual });
  }
}

registerError('INVALID_STORAGE_VERSION', (_, context) => {
  return new InvalidStorageVersionError(context.expected ?? NaN, context.actual ?? NaN);
});

export class SpaceNotFoundError extends DatabaseError {
  constructor(spaceKey: PublicKey) {
    super('SPACE_NOT_FOUND', 'Space not found.', { spaceKey });
  }
}

registerError('SPACE_NOT_FOUND', (_, context) => {
  return new SpaceNotFoundError(PublicKey.safeFrom(context.spaceKey) ?? PublicKey.from('00'));
});

export class EntityNotFoundError extends DatabaseError {
  constructor(entityId: ObjectId) {
    super('ITEM_NOT_FOUND', 'Item not found.', { entityId });
  }
}

registerError('ITEM_NOT_FOUND', (_, context) => {
  return new EntityNotFoundError(context.entityId);
});

export class UnknownModelError extends DatabaseError {
  constructor(model: string) {
    super('UNKNOWN_MODEL', 'Unknown model.', { model });
  }
}

registerError('UNKNOWN_MODEL', (_, context) => {
  return new UnknownModelError(context.model);
});

export class AuthorizationError extends ApiError {
  constructor(message?: string, context?: any) {
    super('AUTHORIZATION_ERROR', message, context);
  }
}

registerErrorMessageContext('AUTHORIZATION_ERROR', AuthorizationError);
