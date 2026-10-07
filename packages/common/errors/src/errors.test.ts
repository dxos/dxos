//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { BaseError, type BaseErrorOptions, messageOf } from './base.ts';
import { SystemError } from './errors.ts';

describe('errors', () => {
  test('error code and message, cause', ({ expect }) => {
    const error = new SystemError({ message: 'Test message', cause: new Error('Test cause'), context: { a: 1, b: 2 } });
    expect(error).toBeInstanceOf(SystemError);
    expect(error).toBeInstanceOf(SystemError);
    expect(error.name).toBe(SystemError.name);
    expect(error._tag).toBe(SystemError.name);
    expect(error.message).toBe('Test message: {"a":1,"b":2}');
    expect(error.cause).toBeInstanceOf(Error);
    expect((error.cause as Error).message).toBe('Test cause');
    expect(error.context).toEqual({ a: 1, b: 2 });
  });

  test('error formatting', ({ expect }) => {
    try {
      throwError();
      expect.fail('Expected error to be thrown');
    } catch (error: any) {
      expect(error).toBeInstanceOf(SystemError);
      expect(String(error)).toEqual('SystemError: Test message');
      const stackLines = error.stack!.split('\n');
      expect(stackLines?.[0]).toEqual('SystemError: Test message');
      expect(stackLines?.[1]).toMatch(/^ {4}at two \(.*$/);
      expect(stackLines?.[2]).toMatch(/^ {4}at one \(.*$/);
    }
  });

  test('custom message', ({ expect }) => {
    class CustomError extends BaseError.extend('CustomError', 'Custom message') {
      constructor(value: number, options?: Omit<BaseErrorOptions, 'context'>) {
        super({ context: { value }, ...options });
      }
    }

    const error = new CustomError(1);
    expect(error).toBeInstanceOf(CustomError);
    expect(error.message).toBe('Custom message: {"value":1}');
    expect(error.context).toEqual({ value: 1 });
  });

  test('is', ({ expect }) => {
    const error = new SystemError({ message: 'Test message' });
    expect(SystemError.is(error)).toBe(true);
  });

  describe('wrap', () => {
    test('carries the wrapped message so the cause is not the only place it survives', ({ expect }) => {
      const error = SystemError.wrap()(new Error('disk full'));
      expect(error).toBeInstanceOf(SystemError);
      expect(error.message).toBe('disk full');
      expect((error.cause as Error).message).toBe('disk full');
    });

    test('an explicit message wins over the wrapped one', ({ expect }) => {
      expect(SystemError.wrap({ message: 'Upload failed.' })(new Error('disk full')).message).toBe('Upload failed.');
    });

    test('falls back to the class default when the value carries no message', ({ expect }) => {
      expect(SystemError.wrap()(42).message).toBe('System error');
      expect(SystemError.wrap()({}).message).toBe('System error');
    });

    test('reads a string and a plain error-shaped object', ({ expect }) => {
      expect(SystemError.wrap()('boom').message).toBe('boom');
      expect(SystemError.wrap()({ name: 'QuotaExceeded', message: 'too many' }).message).toBe('too many');
    });

    test('ifTypeDiffers passes an error of this class through untouched', ({ expect }) => {
      const original = new SystemError({ message: 'Test message' });
      expect(SystemError.wrap({ ifTypeDiffers: true })(original)).toBe(original);
      expect(SystemError.wrap({ ifTypeDiffers: true })(new Error('other')).message).toBe('other');
    });

    test('positions the stack at the caller rather than inside wrap', ({ expect }) => {
      const raise = () => SystemError.wrap()(new Error('inner'));
      expect(raise().stack!.split('\n')[1]).to.match(/^ {4}at raise \(/);
    });
  });
});

describe('messageOf', () => {
  test('reads Error, string and error-shaped values, and nothing else', ({ expect }) => {
    expect(messageOf(new Error('boom'))).toBe('boom');
    expect(messageOf('boom')).toBe('boom');
    expect(messageOf({ message: 'boom' })).toBe('boom');
    expect(messageOf({ message: 7 })).toBeUndefined();
    expect(messageOf({})).toBeUndefined();
    expect(messageOf(null)).toBeUndefined();
    expect(messageOf(42)).toBeUndefined();
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
