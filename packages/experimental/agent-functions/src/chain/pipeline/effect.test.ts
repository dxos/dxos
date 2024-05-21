//
// Copyright 2024 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Effect, type Exit, pipe } from 'effect';
import { isFailType } from 'effect/Cause';
import { isFailure } from 'effect/Exit';

import { describe, test } from '@dxos/test';

chai.use(chaiAsPromised);

// https://effect.website/docs/guides/essentials/creating-effects
// Effect is a description of a program.
// Effect<REQ, ERR, RES> is a description of a program that requires REQ, may fail with ERR, and succeeds with RES.
// Power from composition/chaining (via pipe).

// TODO(burdon): Effect.schedule(), Effect.cron()

describe('Effect', () => {
  test('sync', async () => {
    type SyncTest = {
      program: Effect.Effect<unknown, Error>;
      result?: any;
      error?: string;
    };

    const tests: SyncTest[] = [
      {
        program: Effect.succeed(42),
        result: 42,
      },
      {
        program: Effect.fail(new Error('invalid')),
        error: 'invalid',
      },
      {
        program: Effect.sync(() => 42),
        result: 42,
      },
      {
        program: pipe(
          Effect.succeed(100),
          Effect.map((x: number) => x * 2),
          Effect.map((x: number) => x + 1),
        ),
        result: 201,
      },
      {
        program: Effect.try({
          try: () => {
            throw new Error('invalid');
          },
          catch: (err) => new Error('caught', { cause: err }),
        }),
        error: 'caught',
      },
      // Flatten success/fail channels.
      {
        program: pipe(
          Effect.succeed({ x: 100, y: 4 }),
          Effect.flatMap(({ x, y }) => (y === 0 ? Effect.fail(new Error('divide by zero')) : Effect.succeed(x / y))),
        ),
        result: 25,
      },
      {
        program: pipe(
          Effect.succeed({ x: 100, y: 0 }),
          Effect.flatMap(({ x, y }) => (y === 0 ? Effect.fail(new Error('divide by zero')) : Effect.succeed(x / y))),
        ),
        error: 'divide by zero',
      },
    ];

    for (const { program, result, error } of tests) {
      if (error) {
        expect(() => Effect.runSync(program)).to.throw(Error, error);
      } else {
        expect(Effect.runSync(program)).to.eq(result);
      }
    }
  });

  test('async', async () => {
    type AsyncTest = {
      program: Effect.Effect<unknown, Error>;
      result?: any;
      error?: string;
    };

    const tests: AsyncTest[] = [
      {
        program: Effect.promise(() => Promise.resolve(42)),
        result: 42,
      },
      {
        program: pipe(
          Effect.promise(() => Promise.resolve(42)),
          Effect.map(async (value) => Promise.resolve(value * 2)),
        ),
        result: 84,
      },
      {
        program: Effect.try({
          try: async () => 42,
          catch: (err) => new Error('caught', { cause: err }),
        }),
        result: 42,
      },
      {
        program: Effect.try({
          try: async () => {
            return Promise.reject(new Error());
          },
          catch: (err) => new Error('caught', { cause: err }),
        }),
        error: 'caught',
      },
    ];

    for (const { program, result, error } of tests) {
      if (error) {
        // TODO(burdon): Error if try to specify what is caught.
        //  AssertionError: expected [Function] to throw Error.
        expect(() => Effect.runPromise(program)).to.throw;
      } else {
        expect(await Effect.runPromise(program)).to.eq(result);
      }
    }
  });

  test('types', async () => {
    type Input = { value: number };
    type Program = <R>(self: Effect.Effect<Input, Error, R>) => Effect.Effect<Input, Error, R>;

    const program: Program = Effect.flatMap(({ value }) =>
      value > 1 ? Effect.fail(new Error()) : Effect.succeed({ value: value * 2 }),
    );

    expect(Effect.runSync(pipe(Effect.succeed({ value: 1 }), program))).to.deep.eq({ value: 2 });
    expect(() => Effect.runSync(pipe(Effect.succeed({ value: 2 }), program))).to.throw;
  });

  test('simple async pipeline', async () => {
    type PipelineFunction = (value: number) => Promise<number>;
    type PipelineFunctionEffect = (value: number) => Effect.Effect<number, Error, never>;

    const tryFunction = (f: PipelineFunction) => (value: number) => {
      return Effect.tryPromise({
        try: async () => f(value),
        catch: (err) => {
          return new Error('failed', { cause: err });
        },
      });
    };

    const inc: PipelineFunction = async (value: number) => value + 1;

    const inc2: PipelineFunctionEffect = (value: number) => {
      return Effect.tryPromise({
        try: async () => {
          if (value === 3) {
            throw new Error();
          }
          return value + 1;
        },
        catch: (err) => {
          return new Error('failed', { cause: err });
        },
      });
    };

    const pipeline = pipe(
      Effect.succeed(1),
      Effect.andThen(tryFunction(inc)),
      Effect.andThen(inc2),
      Effect.andThen(inc2),
      Effect.mapError((err) => {
        return new Error('caught', { cause: err });
      }),
    );

    const result: Exit.Exit<number, Error> = await Effect.runPromiseExit(pipeline);
    if (isFailure(result)) {
      const { cause } = result;
      expect(isFailType(cause)).to.be.true;
      if (isFailType(cause)) {
        const { error } = cause;
        expect(error).to.be.instanceOf(Error);
        expect(error.message).to.eq('caught');
      }
    } else {
      const { value } = result;
      expect(value).to.eq(3);
    }
  });
});
