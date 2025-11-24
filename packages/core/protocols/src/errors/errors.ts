//
// Copyright 2021 DXOS.org
//

import { BaseError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';

import type { ObjectId } from '../types.js';

import { registerError, registerErrorMessageContext, registerErrorNoArgs } from './helpers.js';

/**
 * Thrown when request was terminated because the RPC endpoint has been closed.
 */
export class RpcClosedError extends BaseError.extend(
  'RPC_CLOSED',
  'Request was terminated because the RPC endpoint is closed.',
) {}

registerErrorNoArgs('RPC_CLOSED', RpcClosedError);

/**
 * Thrown when `request` is called when RPC has not been opened.
 */
export class RpcNotOpenError extends BaseError.extend('RPC_NOT_OPEN', 'RPC has not been opened.') {}

registerErrorNoArgs('RPC_NOT_OPEN', RpcNotOpenError);

export class CancelledError extends BaseError.extend('CANCELLED') {}

registerErrorMessageContext('CANCELLED', CancelledError);

export class InvalidConfigError extends BaseError.extend('INVALID_CONFIG') {}

registerErrorMessageContext('INVALID_CONFIG', InvalidConfigError);

/**
 * Explicit failure to connect with remote client services.
 */
export class RemoteServiceConnectionError extends BaseError.extend('REMOTE_SERVICE_CONNECTION_ERROR') {}

registerErrorMessageContext('REMOTE_SERVICE_CONNECTION_ERROR', RemoteServiceConnectionError);

/**
 * Failed to open a connection to remote client services.
 */
export class RemoteServiceConnectionTimeout extends BaseError.extend('REMOTE_SERVICE_CONNECTION_TIMEOUT') {}

registerErrorMessageContext('REMOTE_SERVICE_CONNECTION_TIMEOUT', RemoteServiceConnectionTimeout);

export class DataCorruptionError extends BaseError.extend('DATA_CORRUPTION') {}

registerErrorMessageContext('DATA_CORRUPTION', DataCorruptionError);

export class InvalidInvitationExtensionRoleError extends BaseError.extend('INVALID_INVITATION_EXTENSION_ROLE') {}

registerErrorMessageContext('INVALID_INVITATION_EXTENSION_ROLE', InvalidInvitationExtensionRoleError);

export class IdentityNotInitializedError extends BaseError.extend('IDENTITY_NOT_INITIALIZED') {}

registerErrorMessageContext('IDENTITY_NOT_INITIALIZED', IdentityNotInitializedError);

export class InvalidInvitationError extends BaseError.extend('INVALID_INVITATION') {}

registerErrorMessageContext('INVALID_INVITATION', InvalidInvitationError);

export class AlreadyJoinedError extends BaseError.extend('ALREADY_JOINED') {}

registerErrorMessageContext('ALREADY_JOINED', AlreadyJoinedError);

export class ConnectionResetError extends BaseError.extend('CONNECTION_RESET') {}

registerErrorMessageContext('CONNECTION_RESET', ConnectionResetError);

export class TimeoutError extends BaseError.extend('TIMEOUT') {}

registerErrorMessageContext('TIMEOUT', TimeoutError);

// General protocol error.
export class ProtocolError extends BaseError.extend('PROTOCOL_ERROR') {}

registerErrorMessageContext(ProtocolError.code, ProtocolError);

// General connectivity errors.
export class ConnectivityError extends BaseError.extend('CONNECTIVITY_ERROR') {}

registerErrorMessageContext('CONNECTIVITY_ERROR', ConnectivityError);

export class RateLimitExceededError extends BaseError.extend('RATE_LIMIT_EXCEEDED') {}

registerErrorMessageContext('RATE_LIMIT_EXCEEDED', RateLimitExceededError);

// TODO(nf): Rename? the protocol isn't what's unknown...
export class UnknownProtocolError extends BaseError.extend('UNKNOWN_PROTOCOL_ERROR') {}

registerError(UnknownProtocolError.code, (message, context) => new UnknownProtocolError({ message, context }));

export class InvalidStorageVersionError extends BaseError.extend(
  'INVALID_STORAGE_VERSION',
  'Invalid storage version.',
) {
  constructor(expected: number, actual: number) {
    super({ context: { expected, actual } });
  }
}

registerError('INVALID_STORAGE_VERSION', (_, context) => {
  return new InvalidStorageVersionError(context.expected ?? NaN, context.actual ?? NaN);
});

export class SpaceNotFoundError extends BaseError.extend('SPACE_NOT_FOUND', 'Space not found.') {
  constructor(spaceKey: PublicKey) {
    super({ context: { spaceKey } });
  }
}

registerError('SPACE_NOT_FOUND', (_, context) => {
  return new SpaceNotFoundError(PublicKey.safeFrom(context.spaceKey) ?? PublicKey.from('00'));
});

export class EntityNotFoundError extends BaseError.extend('ITEM_NOT_FOUND', 'Item not found.') {
  constructor(entityId: ObjectId) {
    super({ context: { entityId } });
  }
}

registerError('ITEM_NOT_FOUND', (_, context) => {
  return new EntityNotFoundError(context.entityId);
});

export class UnknownModelError extends BaseError.extend('UNKNOWN_MODEL', 'Unknown model.') {
  constructor(model: string) {
    super({ context: { model } });
  }
}

registerError('UNKNOWN_MODEL', (_, context) => {
  return new UnknownModelError(context.model);
});

export class AuthorizationError extends BaseError.extend('AUTHORIZATION_ERROR') {}

registerErrorMessageContext('AUTHORIZATION_ERROR', AuthorizationError);
