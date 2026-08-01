//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { isClosedConnectionError } from './sqlite-storage';

// `SqliteRandomAccessFile._loadFromDb` swallows a read that races client teardown only when the
// error signals a closed connection. Getting this predicate wrong reintroduces the flake where a
// background load rejects unhandled after the SQL connection closed, crashing the whole test
// worker (exit 1 with no failing test).
describe('isClosedConnectionError', () => {
  test('matches the raw sqlite closed-connection error', () => {
    expect(isClosedConnectionError(new TypeError('The database connection is not open'))).toBe(true);
  });

  test('matches when wrapped in an effect SqlError cause chain', () => {
    const wrapped = Object.assign(new Error('Failed to execute statement'), {
      _tag: 'SqlError',
      cause: new TypeError('The database connection is not open'),
    });
    expect(isClosedConnectionError(wrapped)).toBe(true);
  });

  test('matches a plain string message', () => {
    expect(isClosedConnectionError('SqliteError: the database connection is not open')).toBe(true);
  });

  test('does not match a genuine query error against a live connection', () => {
    const real = Object.assign(new Error('Failed to execute statement'), {
      cause: new Error('no such table: hypercore_files'),
    });
    expect(isClosedConnectionError(real)).toBe(false);
  });

  test('is safe on null / undefined / non-error values', () => {
    expect(isClosedConnectionError(null)).toBe(false);
    expect(isClosedConnectionError(undefined)).toBe(false);
    expect(isClosedConnectionError(42)).toBe(false);
  });

  test('terminates on a self-referential cause chain', () => {
    const cyclic: any = new Error('boom');
    cyclic.cause = cyclic;
    expect(isClosedConnectionError(cyclic)).toBe(false);
  });
});
