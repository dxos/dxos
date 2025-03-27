import { Schema, Data } from 'effect';
import { test, describe } from 'vitest';
import { SystemError, UnknownError } from './errors';

new Error('test error', { cause: new Error('cause error') });

class MyError extends Schema.TaggedError<MyError>()('MyError', {
  extraData: Schema.String,
}) {
  // constructor(...args) {
  //   super(...args);
  //   Error.captureStackTrace(this, new.target);
  // }
}

describe.skip('effect error handling', () => {
  test('default error class', () => {
    function throwError() {
      throw new MyError({ extraData: 'extra data' });
    }

    throwError();
  });

  test.only('error causes', () => {
    function libFn() {
      throw new Error('lib error');
    }

    function appFn() {
      try {
        libFn();
      } catch (error) {
        throw new MyError({ extraData: 'app error' }, { cause: error });
      }
    }

    appFn();
  });
});

describe('normal errors', () => {
  test.only('error causes', () => {
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
});
