//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { BaseError, type BaseErrorOptions } from './base';
import { SystemError } from './errors';

describe('errors', () => {
  test('error code and message, cause', () => {
    const error = new SystemError({ message: 'Test message', cause: new Error('Test cause'), context: { a: 1, b: 2 } });
    expect(error).toBeInstanceOf(SystemError);
    expect(error).toBeInstanceOf(SystemError);
    expect(error.code).toBe(SystemError.code);
    expect(error.message).toBe('Test message');
    expect(error.cause).toBeInstanceOf(Error);
    expect((error.cause as Error).message).toBe('Test cause');
    expect(error.context).toEqual({ a: 1, b: 2 });
  });

  test('error formatting', () => {
    try {
      throwError();
      expect.fail('Expected error to be thrown');
    } catch (error: any) {
      expect(error).toBeInstanceOf(SystemError);
      expect(String(error)).toEqual('SYSTEM: Test message');
      const stackLines = error.stack!.split('\n');
      expect(stackLines?.[0]).toEqual('SYSTEM: Test message');
      expect(stackLines?.[1]).toMatch(/^ {4}at two \(.*$/);
      expect(stackLines?.[2]).toMatch(/^ {4}at one \(.*$/);
    }
  });

  test('custom message', () => {
    class CustomError extends BaseError.extend('CustomError', 'Custom message') {
      constructor(value: number, options?: Omit<BaseErrorOptions, 'context'>) {
        super({ context: { value }, ...options });
      }
    }

    const error = new CustomError(1);
    expect(error).toBeInstanceOf(CustomError);
    expect(error.message).toBe('Custom message');
    expect(error.context).toEqual({ value: 1 });
  });

  test('is', () => {
    const error = new SystemError({ message: 'Test message' });
    expect(SystemError.is(error)).toBe(true);
  });
});

const throwError = () => {
  const one = () => {
    const two = () => {
      throw new SystemError({ message: 'Test message' });
    };
    two();
  };
  one();
};
