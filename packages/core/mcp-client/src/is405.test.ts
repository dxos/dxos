//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import { describe, test } from 'vitest';

import * as McpToolkit from './McpToolkit';

describe('is405', () => {
  test('matches raw Error with 405 in message', ({ expect }) => {
    expect(McpToolkit.is405(new Error('SSE error: Non-200 status code (405)'))).toBe(true);
  });

  test('matches UnknownException wrapping a 405 Error', ({ expect }) => {
    const wrapped = new Cause.UnknownException(new Error('SSE error: Non-200 status code (405)'));
    expect(McpToolkit.is405(wrapped)).toBe(true);
  });

  test('does not match unrelated errors', ({ expect }) => {
    expect(McpToolkit.is405(new Error('connection refused'))).toBe(false);
  });

  test('does not match UnknownException wrapping a non-405 Error', ({ expect }) => {
    const wrapped = new Cause.UnknownException(new Error('connection refused'));
    expect(McpToolkit.is405(wrapped)).toBe(false);
  });

  test('does not match null or undefined', ({ expect }) => {
    expect(McpToolkit.is405(null)).toBe(false);
    expect(McpToolkit.is405(undefined)).toBe(false);
  });
});
