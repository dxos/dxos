//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { stringifyValues } from './logs.ts';

describe('stringifyValues', () => {
  test('serializes errors via stack', ({ expect }) => {
    const error = new Error('upload exploded');
    const result = stringifyValues({ error }, 'ctx_');
    expect(result.ctx_error).toContain('upload exploded');
  });

  test('falls back to name and message when stack is absent', ({ expect }) => {
    const error = new Error('no stack here');
    error.stack = undefined;
    expect(stringifyValues({ error })).toEqual({ error: 'Error: no stack here' });
  });

  test('serializes errors nested past the flatten depth', ({ expect }) => {
    const result = stringifyValues({ outer: { inner: { error: new Error('deep') } } });
    expect(Object.values(result).join()).toContain('deep');
  });

  test('flattens plain objects and stringifies arrays', ({ expect }) => {
    expect(stringifyValues({ status: 502, nested: { count: 1 }, list: [1, 2] })).toEqual({
      status: '502',
      nested_count: '1',
      list: '[1,2]',
    });
  });

  test('skips undefined values and handles a missing object', ({ expect }) => {
    expect(stringifyValues({ present: 'yes', absent: undefined })).toEqual({ present: 'yes' });
    expect(stringifyValues(undefined)).toEqual({});
  });
});
