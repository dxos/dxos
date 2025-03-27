import { Schema, Data } from 'effect';
import { test, describe } from 'vitest';
import { SystemError, UnknownError } from './errors';

class MyError extends Schema.TaggedError<MyError>()('MyError', {
  extraData: Schema.String,
}) {}

describe('effect error handling', () => {
  test.only('default error class', () => {
    function throwError() {
      throw new MyError({ extraData: 'extra data' });
    }

    throwError();
  });

  test('error causes', () => {
    function libFn() {
      throw new Error('lib error');
    }

    function appFn() {
      try {
        libFn();
      } catch (error) {
        throw new MyError({ extraData: 'app error' });
      }
    }

    appFn();
  });
});

describe.skip('normal errors', () => {
  test('error causes', () => {
    function libFn() {
      throw new Error('lib error');
    }

    function appFn() {
      try {
        libFn();
      } catch (error) {
        throw new SystemError('Unknown error', { foo: 'bar', cause: error });
      }
    }

    appFn();
  });

  test('aggregate errors', () => {
    const errors = [new Error('error 1'), new Error('error 2')];
    throw new AggregateError(errors);
  });
});
