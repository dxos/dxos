//
// Copyright 2021 DXOS.org
//

/**
 * NOTE: Messages should be sentences (Start with a capital letter and end with a period).
 * Errors can optionally include a JSON context object.
 */
import { BaseError } from '@dxos/errors';

/**
 * User facing API Errors.
 * E.g., something was misconfigured.
 */
export class ApiError extends BaseError.extend('ApiError') {}

/**
 * Internal system errors.
 * E.g., unexpected/unrecoverable runtime error.
 */
export class SystemError extends BaseError.extend('SystemError') {}

/**
 * Database errors.
 */
export class DatabaseError extends BaseError.extend('DatabaseError') {}
