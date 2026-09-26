//
// Copyright 2026 DXOS.org
//

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
