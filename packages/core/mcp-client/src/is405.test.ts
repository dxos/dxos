//
// Copyright 2026 DXOS.org
//

import { UnknownException } from 'effect/Cause';
import { describe, test } from 'vitest';

import { is405 } from './McpToolkit';

describe('is405', () => {
  test('matches raw Error with 405 in message', ({ expect }) => {
    expect(is405(new Error('SSE error: Non-200 status code (405)'))).toBe(true);
  });

  test('matches UnknownException wrapping a 405 Error', ({ expect }) => {
    const wrapped = new UnknownException(new Error('SSE error: Non-200 status code (405)'));
    expect(is405(wrapped)).toBe(true);
  });

  test('does not match unrelated errors', ({ expect }) => {
    expect(is405(new Error('connection refused'))).toBe(false);
  });

  test('does not match UnknownException wrapping a non-405 Error', ({ expect }) => {
    const wrapped = new UnknownException(new Error('connection refused'));
    expect(is405(wrapped)).toBe(false);
  });

  test('does not match null or undefined', ({ expect }) => {
    expect(is405(null)).toBe(false);
    expect(is405(undefined)).toBe(false);
  });
});
