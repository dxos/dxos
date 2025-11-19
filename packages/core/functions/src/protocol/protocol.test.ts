//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { FunctionError } from '../errors';
import fibFunc from '../example/fib';
import replyFunc from '../example/reply';

import { wrapFunctionHandler } from './protocol';

describe('wrapFunctionHandler', () => {
  test('wraps reply function and executes handler', async ({ expect }) => {
    const wrapped = wrapFunctionHandler(replyFunc);

    expect(wrapped.meta.key).toBe('example.org/function/reply');
    expect(wrapped.meta.name).toBe('Reply');

    const testData = { message: 'hello' };
    const result = await wrapped.handler({
      data: testData,
      context: {
        services: {},
      },
    });

    expect(result).toEqual(testData);
  });

  test('wraps fibonacci function with valid input', async ({ expect }) => {
    const wrapped = wrapFunctionHandler(fibFunc);

    expect(wrapped.meta.key).toBe('example.org/function/fib');
    expect(wrapped.meta.name).toBe('Fibonacci');

    const result = await wrapped.handler({
      data: { iterations: 10 },
      context: {
        services: {},
      },
    });

    expect(result).toEqual({ result: '55' });
  });

  test('throws FunctionError on invalid input schema for fibonacci', async ({ expect }) => {
    const wrapped = wrapFunctionHandler(fibFunc);

    await expect(
      wrapped.handler({
        data: { iterations: 'invalid' },
        context: {
          services: {},
        },
      }),
    ).rejects.toThrow(FunctionError);
  });
});
