//
// Copyright 2021 DXOS.org
//

/**
 * User facing API Errors.
 *
 */
export class ClientError extends Error {
  constructor(readonly code: string, message?: string, readonly context?: any) {
    super(message ? `${code}: ${message}` : code.toString());
    // NOTE: Restores prototype chain (https://stackoverflow.com/a/48342359).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidConfigError extends ClientError {
  constructor(message: string, context?: any) {
    super('INVALID_CONFIG', message, context);
  }
}

export class RemoteServiceConnectionTimeout extends ClientError {
  constructor(message?: string, context?: any) {
    super('REMOTE_SERVICE_CONNECTION_TIMEOUT', message, context);
  }
}
