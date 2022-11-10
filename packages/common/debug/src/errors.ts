//
// Copyright 2021 DXOS.org
//

// TODO(burdon): Move to `@dxos/client`.
// TODO(burdon): Standardize:
//  https://nodejs.org/api/errors.html
//  Consider nanoerror.

/**
 * Error class to be used in the public API.
 * @param code Error code should be formatted in SCREAMING_SNAKE_CASE. Must be prefixed with 'DXOS_.
 * @deprecated
 */
export class DXOSError extends Error {
  constructor(readonly code: string, message?: string) {
    super(message ? `${code}: ${message}` : code.toString());
    // Restore prototype chain.
    // https://stackoverflow.com/a/48342359
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidParameterError extends DXOSError {
  constructor(message?: string) {
    super('DXOS_INVALID_PARAMETER', message);
  }
}

export class InvalidStateError extends DXOSError {
  constructor(message = 'Invalid state.') {
    super('DXOS_INVALID_STATE', message);
  }
}

// TODO(burdon): Reconcile with async.
export class TimeoutError extends DXOSError {
  constructor(message?: string) {
    super('DXOS_TIMEOUT', message);
  }
}
