//
// Copyright 2025 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import { causeToError } from './internal/errors.ts';

class MyError extends Data.TaggedError('MyError')<{
  message: string;
}> {
  constructor() {
    super({ message: 'My error message' });
  }
}

// Experimenting with error formatting:
// - If the error doesn't have the message set, vitest will print the error as a JS object.
// - If the error has non-empty message, vitest will pretty-print the error.
test.skip('Data error formatting', () => {
  console.log(JSON.stringify(new MyError(), null, 2));
  throw new MyError();
});

describe('causeToError', () => {
  const failWith = async (effect: Effect.Effect<unknown, unknown>): Promise<Error> => {
    const exit = await Effect.runPromiseExit(effect);
    invariant(Exit.isFailure(exit));
    return causeToError(exit.cause);
  };

  test('appends the failing span and its parents as stack frames', async ({ expect }) => {
    const error = await failWith(
      Effect.fail(new MyError()).pipe(Effect.withSpan('inner-span'), Effect.withSpan('outer-span')),
    );
    expect(error.stack).to.match(/\n {4}at inner-span \(.+\)\n {4}at outer-span \(.+\)/);
  });

  test('drops effect runtime frames but keeps the location of the thunk that threw', async ({ expect }) => {
    const error = await failWith(
      Effect.sync(() => {
        throw new Error('defect');
      }),
    );
    const [, thunkFrame] = error.stack!.split('\n');
    expect(thunkFrame).to.match(/^ {4}at \S*errors\.test\.ts:\d+:\d+$/);
    expect(error.stack).not.to.match(/~effect\/|FiberImpl/);
  });
});
