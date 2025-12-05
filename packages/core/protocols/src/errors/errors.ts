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
  'RpcClosedError',
  'Request was terminated because the RPC endpoint is closed.',
) {}

registerErrorNoArgs('RpcClosedError', RpcClosedError);

/**
 * Thrown when `request` is called when RPC has not been opened.
 */
export class RpcNotOpenError extends BaseError.extend('RpcNotOpenError', 'RPC has not been opened.') {}

registerErrorNoArgs('RpcNotOpenError', RpcNotOpenError);

export class CancelledError extends BaseError.extend('CancelledError') {}

registerErrorMessageContext('CancelledError', CancelledError);

export class InvalidConfigError extends BaseError.extend('InvalidConfigError') {}

registerErrorMessageContext('InvalidConfigError', InvalidConfigError);

/**
 * Explicit failure to connect with remote client services.
 */
export class RemoteServiceConnectionError extends BaseError.extend('RemoteServiceConnectionError') {}

registerErrorMessageContext('RemoteServiceConnectionError', RemoteServiceConnectionError);

/**
 * Failed to open a connection to remote client services.
 */
export class RemoteServiceConnectionTimeout extends BaseError.extend('RemoteServiceConnectionTimeout') {}

registerErrorMessageContext('RemoteServiceConnectionTimeout', RemoteServiceConnectionTimeout);

export class DataCorruptionError extends BaseError.extend('DataCorruptionError') {}

registerErrorMessageContext('DataCorruptionError', DataCorruptionError);

export class InvalidInvitationExtensionRoleError extends BaseError.extend('InvalidInvitationExtensionRoleError') {}

registerErrorMessageContext('InvalidInvitationExtensionRoleError', InvalidInvitationExtensionRoleError);

export class IdentityNotInitializedError extends BaseError.extend('IdentityNotInitializedError') {}

registerErrorMessageContext('IdentityNotInitializedError', IdentityNotInitializedError);

export class InvalidInvitationError extends BaseError.extend('InvalidInvitationError') {}

registerErrorMessageContext('InvalidInvitationError', InvalidInvitationError);

export class AlreadyJoinedError extends BaseError.extend('AlreadyJoinedError') {}

registerErrorMessageContext('AlreadyJoinedError', AlreadyJoinedError);

export class ConnectionResetError extends BaseError.extend('ConnectionResetError') {}

registerErrorMessageContext('ConnectionResetError', ConnectionResetError);

export class TimeoutError extends BaseError.extend('TimeoutError') {}

registerErrorMessageContext('TimeoutError', TimeoutError);

// General protocol error.
export class ProtocolError extends BaseError.extend('ProtocolError') {}

registerErrorMessageContext(ProtocolError.name, ProtocolError);

// General connectivity errors.
export class ConnectivityError extends BaseError.extend('ConnectivityError') {}

registerErrorMessageContext('ConnectivityError', ConnectivityError);

export class RateLimitExceededError extends BaseError.extend('RateLimitExceededError') {}

registerErrorMessageContext('RateLimitExceededError', RateLimitExceededError);

// TODO(nf): Rename? the protocol isn't what's unknown...
export class UnknownProtocolError extends BaseError.extend('UnknownProtocolError') {}

registerError(UnknownProtocolError.name, (message, context) => new UnknownProtocolError({ message, context }));

export class InvalidStorageVersionError extends BaseError.extend(
  'InvalidStorageVersionError',
  'Invalid storage version.',
) {
  constructor(expected: number, actual: number) {
    super({ context: { expected, actual } });
  }
}

registerError('InvalidStorageVersionError', (_, context) => {
  return new InvalidStorageVersionError(context.expected ?? NaN, context.actual ?? NaN);
});

export class SpaceNotFoundError extends BaseError.extend('SpaceNotFoundError', 'Space not found.') {
  constructor(spaceKey: PublicKey) {
    super({ context: { spaceKey } });
  }
}

registerError('SpaceNotFoundError', (_, context) => {
  return new SpaceNotFoundError(PublicKey.safeFrom(context.spaceKey) ?? PublicKey.from('00'));
});

export class EntityNotFoundError extends BaseError.extend('EntityNotFoundError', 'Item not found.') {
  constructor(entityId: ObjectId) {
    super({ context: { entityId } });
  }
}

registerError('EntityNotFoundError', (_, context) => {
  return new EntityNotFoundError(context.entityId);
});

export class UnknownModelError extends BaseError.extend('UnknownModelError', 'Unknown model.') {
  constructor(model: string) {
    super({ context: { model } });
  }
}

registerError('UnknownModelError', (_, context) => {
  return new UnknownModelError(context.model);
});

export class AuthorizationError extends BaseError.extend('AuthorizationError') {}

registerErrorMessageContext('AuthorizationError', AuthorizationError);
