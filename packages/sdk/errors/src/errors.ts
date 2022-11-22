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

export class InvalidConfigError extends ApiError {
  constructor(message: string, context?: any) {
    super('INVALID_CONFIG', message, context);
  }
}

export class RemoteServiceConnectionTimeout extends ApiError {
  constructor(message?: string, context?: any) {
    super('REMOTE_SERVICE_CONNECTION_TIMEOUT', message, context);
  }
}
