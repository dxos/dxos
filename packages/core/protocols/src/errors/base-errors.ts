//
// Copyright 2021 DXOS.org
//

/**
 * NOTE: Messages should be sentences (Start with a capital letter and end with a period).
 * Errors can optionally include a JSON context object.
 */
export class BaseError extends Error {
  constructor(readonly code: string, message?: string, readonly context?: Record<string, any>) {
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
