import { Schema, Data } from 'effect';
import { test, describe } from 'vitest';
import { SystemError, UnknownError } from './errors';

class MyError extends Schema.TaggedError<MyError>()('MyError', {
  extraData: Schema.String,
}) {
  override toJSON(): unknown {
    return {
      ...(super.toJSON() as any),
      message: this.message,
    };
  }
}

describe('effect error handling', () => {
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
        throw new MyError({ extraData: 'app error' });
      }
    }

    appFn();
  });
});

class MyError2 extends Error {
  toJSON() {
    return {
      ...this,
      message: this.message,
      cause: this.cause,
    };
  }
}

describe.skip('normal errors', () => {
  test.only('error causes', () => {
    function libFn() {
      throw new Error('lib error');
    }

    function appFn() {
      try {
        libFn();
      } catch (error) {
        throw new MyError2('Unknown error', { cause: error });
      }
    }

    appFn();
  });

  test('aggregate errors', () => {
    const errors = [new Error('error 1'), new Error('error 2')];
    throw new AggregateError(errors);
  });
});
