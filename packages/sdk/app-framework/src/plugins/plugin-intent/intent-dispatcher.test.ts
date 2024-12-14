//
// Copyright 2024 DXOS.org
//

import { Effect, Fiber } from 'effect';
import { describe, expect, test } from 'vitest';

import { S } from '@dxos/echo-schema';

import { createIntent } from './intent';
import { createDispatcher, createResolver } from './intent-dispatcher';

class ToString extends S.TaggedClass<ToString>()('ToString', {
  input: S.Struct({
    value: S.Number,
  }),
  output: S.Struct({
    string: S.String,
  }),
}) {}

const toStringResolver = createResolver(ToString, async (data) => {
  return { data: { string: data.value.toString() } };
});

class Compute extends S.TaggedClass<Compute>()('Compute', {
  input: S.Struct({
    value: S.Number,
  }),
  output: S.Struct({
    result: S.Number,
  }),
}) {}

const computeResolver = createResolver(Compute, (data) => {
  return Effect.gen(function* () {
    yield* Effect.sleep(data.value * 10);
    return { data: { result: data.value * 2 } };
  });
});

describe('Intent dispatcher', () => {
  test('throws error if no resolver found', async () => {
    const { dispatchPromise } = createDispatcher([]);
    await expect(dispatchPromise(createIntent(ToString, { value: 1 }))).rejects.toThrow();
  });

  test('matches intent to resolver and executes', async () => {
    const { dispatchPromise } = createDispatcher([toStringResolver]);
    const { data } = await dispatchPromise(createIntent(ToString, { value: 1 }));
    expect(data.string).toBe('1');
  });

  test('compose intent effects', async () => {
    const { dispatch } = createDispatcher([computeResolver]);
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 1 }));
      const b = yield* dispatch(createIntent(Compute, { value: 2 }));
      return b.data.result - a.data.result;
    });

    expect(await Effect.runPromise(program)).toBe(2);
  });

  test('concurrent intent effects', async () => {
    const { dispatch } = createDispatcher([computeResolver]);
    const program = Effect.gen(function* () {
      const fiberA = yield* Effect.fork(dispatch(createIntent(Compute, { value: 5 })));
      const fiberB = yield* Effect.fork(dispatch(createIntent(Compute, { value: 2 })));
      const [a, b] = yield* Fiber.join(Fiber.zip(fiberA, fiberB));
      return b.data.result - a.data.result;
    });

    expect(await Effect.runPromise(program)).toBe(-6);
  });

  test('mix & match intent effects', async () => {
    const { dispatch, dispatchPromise } = createDispatcher([toStringResolver, computeResolver]);
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 2 }));
      const b = yield* dispatch(createIntent(ToString, { value: a.data.result }));
      return b.data.string;
    });

    expect(await Effect.runPromise(program)).toBe('4');

    const a = await dispatchPromise(createIntent(Compute, { value: 2 }));
    const b = await dispatchPromise(createIntent(ToString, { value: a.data.result }));
    expect(b.data.string).toBe('4');
  });
});
