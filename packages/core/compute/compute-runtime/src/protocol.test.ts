//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { InvalidOperationInputError } from '@dxos/compute';
import { FibonacciHandler, ReplyHandler } from '@dxos/compute/testing';
import { DXN } from '@dxos/keys';

import { wrapFunctionHandler } from './protocol';

describe('wrapFunctionHandler', () => {
  test('wraps reply function and executes handler', async ({ expect }) => {
    const wrapped = wrapFunctionHandler(ReplyHandler);

    expect(wrapped.meta.key).toBe(DXN.make('org.example.function.reply'));
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
    const wrapped = wrapFunctionHandler(FibonacciHandler);

    expect(wrapped.meta.key).toBe(DXN.make('org.example.function.fib'));
    expect(wrapped.meta.name).toBe('Fibonacci');

    const result = await wrapped.handler({
      data: { iterations: 10 },
      context: {
        services: {},
      },
    });

    expect(result).toEqual({ result: '55' });
  });

  test('throws InvalidOperationInputError on invalid input schema for fibonacci', async ({ expect }) => {
    const wrapped = wrapFunctionHandler(FibonacciHandler);

    await expect(
      wrapped.handler({
        data: { iterations: 'invalid' },
        context: {
          services: {},
        },
      }),
    ).rejects.toThrow(InvalidOperationInputError);
  });
});
