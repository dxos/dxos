//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { BaseError, type BaseErrorOptions } from '@dxos/errors';
import { type URI } from '@dxos/keys';

export class SchemaNotFoundError extends BaseError.extend('SchemaNotFoundError', 'Schema not found') {
  constructor(schema: string, options?: BaseErrorOptions) {
    super({ context: { schema }, ...options });
  }
}

export class EntityNotFoundError extends BaseError.extend('EntityNotFoundError', 'Entity not found') {
  constructor(uri: URI.URI, options?: BaseErrorOptions) {
    super({ context: { uri }, ...options });
  }
}

/**
 * Thrown when a `Text` mutation is attempted on an object whose reactive handler does not implement
 * string CRDT editing (e.g. a snapshot or a non-reactive value).
 */
export class TextNotSupportedError extends BaseError.extend(
  'TextNotSupportedError',
  'Text operation is not supported for this object',
) {
  constructor(operation: string, options?: BaseErrorOptions) {
    super({ context: { operation }, ...options });
  }
}

/**
 * Thrown by `Text.apply` when a non-`replaceAll` edit's `oldString` is not found in the text.
 */
export class TextEditNotFoundError extends BaseError.extend('TextEditNotFoundError', 'Edit text not found') {
  constructor(oldString: string, options?: BaseErrorOptions) {
    super({ context: { oldString }, ...options });
  }
}

/**
 * Reason why getting a reactive object from a snapshot failed.
 * - `no-database`: The snapshot is not associated with a database.
 * - `object-not-found`: The object was removed or does not exist in the database.
 */
export type GetReactiveErrorReason = 'no-database' | 'object-not-found';

/**
 * Error thrown when a reactive object cannot be resolved from a snapshot.
 * Extends `BaseError` with a `reason` and optional `snapshotId` in its context.
 */
export class GetReactiveError extends BaseError.extend(
  'GetReactiveError',
  'Failed to get reactive object from snapshot',
) {
  constructor(options: { reason: GetReactiveErrorReason; snapshotId?: string } & BaseErrorOptions) {
    super({ context: { reason: options.reason, snapshotId: options.snapshotId }, ...options });
  }
}
