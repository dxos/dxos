//
// Copyright 2021 DXOS.org
//

/**
 * NOTE: Messages should be sentences (Start with a capital letter and end with a period).
 * Errors can optionally include a JSON context object.
 */
// TODO(dmaretskyi): Duplicate of @dxos/errors
export class BaseError extends Error {
  constructor(
    readonly code: string,
    message?: string,
    readonly context?: Record<string, any>,
  ) {
    // TODO(dmaretskyi): Error.cause.
    super(message ?? code);
    this.name = code;
    // NOTE: Restores prototype chain (https://stackoverflow.com/a/48342359).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// TODO(dmaretskyi): Consider common error classes with error codes:
// throw new SystemError(ERROR_CODE_OUT_OF_MEMORY, 'Out of memory', { a: 1, b: 2 });

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
