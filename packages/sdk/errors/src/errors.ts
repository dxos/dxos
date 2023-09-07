//
// Copyright 2021 DXOS.org
//

/**
 * NOTE: Messages should be sentences (Start with a capital letter and end with a period).
 * Errors can optionally include a JSON context object.
 */
class BaseError extends Error {
  constructor(readonly code: string, message?: string, readonly context?: any) {
    super(message ? `${code}: ${message}` : code.toString());
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

export class CancelledError extends SystemError {
  constructor(message?: string, context?: any) {
    super('CANCELLED', message, context);
  }
}

export class InvalidConfigError extends ApiError {
  constructor(message: string, context?: any) {
    super('INVALID_CONFIG', message, context);
  }
}

/**
 * Explicit failure to connect with remote client services.
 */
export class RemoteServiceConnectionError extends ApiError {
  constructor(message?: string, context?: any) {
    super('REMOTE_SERVICE_CONNECTION_ERROR', message, context);
  }
}

/**
 * Failed to open a connection to remote client services.
 */
export class RemoteServiceConnectionTimeout extends ApiError {
  constructor(message?: string, context?: any) {
    super('REMOTE_SERVICE_CONNECTION_TIMEOUT', message, context);
  }
}

export class DataCorruptionError extends SystemError {
  constructor(message?: string, context?: any) {
    super('DATA_CORRUPTION', message, context);
  }
}

export class InvalidInvitationExtensionRoleError extends SystemError {
  constructor(message?: string, context?: any) {
    super('INVALID_INVITATION_EXTENSION_ROLE', message, context);
  }
}

export class ConnectionResetError extends BaseError {
  constructor(message?: string, context?: any) {
    super('connection reset', message, context);
  }
}

export class TimeoutError extends BaseError {
  constructor(message?: string, context?: any) {
    super('connection timeout', message, context);
  }
}

// general protocol error
export class ProtocolError extends BaseError {
  constructor(message?: string, context?: any) {
    super('general protocol error', message, context);
  }
}

// general connectivity errors
export class ConnectivityError extends BaseError {
  constructor(message?: string, context?: any) {
    super('connectivity error', message, context);
  }
}

// TODO(nf): rename? the protocol isn't what's unknown...
export class UnknownProtocolError extends BaseError {
  constructor(message?: string, innerError?: Error) {
    super('unknown protocol error', message, innerError);
  }
}
