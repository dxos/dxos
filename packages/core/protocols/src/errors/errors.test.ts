//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { ApiError } from './base-errors.ts';
import { decodeError, encodeError } from './encoding.ts';
import { toServiceError } from './helpers.ts';

describe('Errors', () => {
  test('test', async () => {
    const runTest = async () => {
      throw new ApiError({ message: 'Test error' });
    };

    await expect(runTest()).rejects.toThrowError('Test error');
  });

  test('the cause chain survives encoding', ({ expect }) => {
    const error = new Error('Failed to execute statement', {
      cause: new Error('Failed to execute statement', { cause: new RangeError('Bad value') }),
    });

    const decoded = decodeError(encodeError(error));
    expect(decoded.message).toEqual('Failed to execute statement');
    expect(decoded.stack).toContain(error.stack);
    expect(decoded.stack).toContain('\nCaused by: Error: Failed to execute statement');
    expect(decoded.stack).toContain('\nCaused by: RangeError: Bad value');
  });

  test('a service error does not repeat the stack of the error it wraps', ({ expect }) => {
    const sqlError = new Error('Failed to execute statement', { cause: new RangeError('Bad value') });

    const stack = decodeError(encodeError(toServiceError(sqlError))).stack ?? '';
    expect(stack.split(sqlError.stack ?? '')).toHaveLength(2);
    expect(stack).toContain('\nCaused by: RangeError: Bad value');
  });
});
