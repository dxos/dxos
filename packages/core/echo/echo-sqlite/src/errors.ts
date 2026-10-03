//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * Raised by the parts of the `Database` interface this backend deliberately leaves out
 * (feeds, branches, history, external blob storage).
 */
export class UnsupportedOperationError extends Error {
  constructor(operation: string) {
    super(`Not supported by echo-sqlite: ${operation}`);
    this.name = 'UnsupportedOperationError';
  }
}

/**
 * Raised for query clauses that cannot be compiled to SQL; there is no in-memory fallback.
 */
export class UnsupportedQueryError extends Error {
  constructor(clause: string) {
    super(`Query clause not supported by echo-sqlite: ${clause}`);
    this.name = 'UnsupportedQueryError';
  }
}

/**
 * Raised for a store call whose transport was disconnected before it answered, or after.
 */
export class StoreDisconnectedError extends BaseError.extend(
  'StoreDisconnectedError',
  'Store transport disconnected.',
) {
  constructor(reason?: string) {
    super({ context: reason ? { reason } : undefined });
  }
}
