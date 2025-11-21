//
// Copyright 2021 DXOS.org
//

// TODO(dmaretskyi): Reconcile with @dxos/errors

/**
 * NOTE: Messages should be sentences (Start with a capital letter and end with a period).
 * Errors can optionally include a JSON context object.
 */
import { BaseError } from '@dxos/errors';

export { BaseError };

// TODO(dmaretskyi): Reconcile with @dxos/errors

/**
 * User facing API Errors.
 * E.g., something was misconfigured.
 */
export class ApiError extends BaseError {
  constructor(code: string, message?: string, context?: Record<string, any>) {
    super(code, { message: message ?? code, context });
  }
}

/**
 * Internal system errors.
 * E.g., unexpected/unrecoverable runtime error.
 */
export class SystemError extends BaseError {
  constructor(code: string, message?: string, context?: Record<string, any>) {
    super(code, { message: message ?? code, context });
  }
}

/**
 * Database errors.
 */
// TODO(wittjosiah): Same as ApiError?
export class DatabaseError extends BaseError {
  constructor(code: string, message?: string, context?: Record<string, any>) {
    super(code, { message: message ?? code, context });
  }
}

