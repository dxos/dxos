//
// Copyright 2025 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import { causeToError, runPromise } from './internal/errors.ts';

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
  test('appends the failing span and its parents as stack frames', async ({ expect }) => {
    const error = await failWith(
      Effect.fail(new MyError()).pipe(Effect.withSpan('inner-span'), Effect.withSpan('outer-span')),
    );
    expect(error.stack).to.match(/\n {4}at inner-span \(.+\)\n {4}at outer-span \(.+\)/);
  });

  test('drops effect runtime frames but keeps the location of the thunk that threw', async ({ expect }) => {
    const throwing = [
      Effect.sync(() => {
        throw new Error('defect');
      }),
      // The assertion below is on the thrown `Error`'s own stack, so the `catch` has to hand it
      // back untouched; wrapping it would replace the frames under test, and dropping the `catch`
      // reports `UnknownError`'s stack instead.
      // @effect-diagnostics-next-line unknownInEffectCatch:off
      Effect.try({
        try: () => {
          throw new Error('failure');
        },
        catch: (error) => error,
      }),
      // `map` calls the thunk through an anonymous runtime callback, which carries no `~effect/` name and stays.
      Effect.succeed(1).pipe(
        Effect.map(() => {
          throw new Error('defect');
        }),
      ),
    ];
    for (const effect of throwing) {
      const error = await failWith(effect);
      const [, thunkFrame] = error.stack!.split('\n');
      expect(thunkFrame).to.match(/^ {4}at (?:\S+ \()?\S*errors\.test\.ts:\d+:\d+\)?$/);
      expect(error.stack).not.to.match(/~effect\/|FiberImpl/);
    }
  });

  test('drops effect runtime frames from the call site when converting inside a fiber', async ({ expect }) => {
    const exit = await Effect.runPromiseExit(Effect.die(new Error('defect')));
    invariant(Exit.isFailure(exit));
    const error = await runPromise(Effect.sync(() => causeToError(exit.cause)));
    expect(error.stack).not.to.match(/~effect\/|FiberImpl/);
  });
});

const failWith = async (effect: Effect.Effect<unknown, unknown>): Promise<Error> => {
  const exit = await Effect.runPromiseExit(effect);
  invariant(Exit.isFailure(exit));
  return causeToError(exit.cause);
};
