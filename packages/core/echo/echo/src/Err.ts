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
 * Thrown when a blob's bytes exceed the inline storage size limit.
 */
export class BlobTooLargeError extends BaseError.extend('BlobTooLargeError', 'Blob is too large for inline storage') {
  constructor(context: { size: number; limit: number }, options?: BaseErrorOptions) {
    super({ context, ...options });
  }
}

/**
 * Reason why a blob's bytes could not be read.
 * - `offline`: The backend's transport failed (e.g. network unavailable).
 * - `not-found`: The backend could not locate the bytes for the given URI.
 * - `backend-not-registered`: No backend is registered for the URI's scheme.
 */
export type BlobNotAvailableReason = 'offline' | 'not-found' | 'backend-not-registered';

/**
 * Thrown when a blob's bytes cannot be read from its backend.
 */
export class BlobNotAvailableError extends BaseError.extend('BlobNotAvailableError', 'Blob is not available') {
  constructor(context: { backend: string; key: string; reason: BlobNotAvailableReason }, options?: BaseErrorOptions) {
    super({ context, ...options });
  }
}

/**
 * Thrown when a blob's bytes fail to upload to its backend.
 */
export class BlobWriteError extends BaseError.extend('BlobWriteError', 'Failed to write blob') {
  constructor(context: { backend: string }, options?: BaseErrorOptions) {
    super({ context, ...options });
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
