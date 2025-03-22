import { Cause, Effect, Schema } from 'effect';
import { it as test } from '@effect/vitest';

class MyError extends Schema.TaggedError<MyError>('MyError')('MyError', {
  module: Schema.String,
  method: Schema.String,
  description: Schema.String,
}) {
  override get message(): string {
    return `${this.module}.${this.method}: ${this.description}`;
  }
}
const e = Effect.fail(
  new MyError({ module: 'myModule', method: 'test', description: 'foo' }, { cause: new Error('bar') }),
);
test.effect('fmt', () => {
  throw new MyError({ module: 'myModule', method: 'test', description: 'foo' }, { cause: new Error('bar') });
});

test('log', () => {
  const error = new MyError({ module: 'myModule', method: 'test', description: 'foo' }, { cause: new Error('bar') });
  console.error(error);
});

test.only('causes', () => {
  const e = Effect.fail(
    new MyError({ module: 'myModule', method: 'test', description: 'foo' }, { cause: new Error('bar') }),
  );

  const e2 = Effect.fail(
    new MyError({ module: 'myModule', method: 'test', description: 'foo' }, { cause: new Error('bar') }),
  );

  Effect.all([e, e2], { concurrency: 'unbounded' }).pipe(
    Effect.catchAllCause((cause) => {
      console.log(cause);
      return Effect.succeed('ok');
    }),
    Effect.runPromise,
    console.log,
  );
});
