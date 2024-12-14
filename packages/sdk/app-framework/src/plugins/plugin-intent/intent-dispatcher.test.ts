//
// Copyright 2024 DXOS.org
//

import { Effect, Fiber, pipe } from 'effect';
import { describe, expect, test } from 'vitest';

import { S } from '@dxos/echo-schema';

import { chain, createIntent } from './intent';
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
    value: S.Number,
  }),
}) {}

const computeResolver = createResolver(Compute, (data, undo) => {
  return Effect.gen(function* () {
    if (undo) {
      return { data: { value: data.value / 2 } };
    }

    yield* Effect.sleep(data.value * 10);
    const value = data.value * 2;
    return { data: { value }, undoable: { message: 'test', data: { value } } };
  });
});

class Concat extends S.TaggedClass<Concat>()('Concat', {
  input: S.Struct({
    string: S.String,
    plus: S.String,
  }),
  output: S.Struct({
    string: S.String,
  }),
}) {}

const concatResolver = createResolver(Concat, async (data) => {
  return { data: { string: data.string + data.plus } };
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
      return b.data.value - a.data.value;
    });

    expect(await Effect.runPromise(program)).toBe(2);
  });

  test('concurrent intent effects', async () => {
    const { dispatch } = createDispatcher([computeResolver]);
    const program = Effect.gen(function* () {
      const fiberA = yield* Effect.fork(dispatch(createIntent(Compute, { value: 5 })));
      const fiberB = yield* Effect.fork(dispatch(createIntent(Compute, { value: 2 })));
      const [a, b] = yield* Fiber.join(Fiber.zip(fiberA, fiberB));
      return b.data.value - a.data.value;
    });

    expect(await Effect.runPromise(program)).toBe(-6);
  });

  test('mix & match intent effects', async () => {
    const { dispatch, dispatchPromise } = createDispatcher([toStringResolver, computeResolver]);
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 2 }));
      const b = yield* dispatch(createIntent(ToString, { value: a.data.value }));
      return b.data.string;
    });

    expect(await Effect.runPromise(program)).toBe('4');

    const a = await dispatchPromise(createIntent(Compute, { value: 2 }));
    const b = await dispatchPromise(createIntent(ToString, { value: a.data.value }));
    expect(b.data.string).toBe('4');
  });

  test('undo intent', async () => {
    const { dispatch, undo } = createDispatcher([computeResolver]);
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 2 }));
      expect(a.data.value).toBe(4);
      const b = yield* undo();
      expect(b?.data.value).toBe(2);
    });

    await Effect.runPromise(program);
  });

  test('chain intents', async () => {
    const { dispatch } = createDispatcher([computeResolver, toStringResolver, concatResolver]);
    const intent = pipe(createIntent(Compute, { value: 1 }), chain(ToString, {}), chain(Concat, { plus: '!' }));
    expect(intent.first.action).toBe(Compute._tag);
    expect(intent.last.action).toBe(Concat._tag);
    expect(intent.all.length).toBe(3);

    const program = Effect.gen(function* () {
      const { data } = yield* dispatch(intent);
      return data.string;
    });

    expect(await Effect.runPromise(program)).toBe('2!');
  });

  test('undo chained intent', async () => {
    const { dispatch, undo } = createDispatcher([computeResolver, toStringResolver, concatResolver]);
    const intent = pipe(createIntent(Compute, { value: 1 }), chain(Compute, {}), chain(Compute, {}));
    const program = Effect.gen(function* () {
      const a = yield* dispatch(intent);
      expect(a.data.value).toBe(8);
      const b = yield* undo();
      expect(b?.data.value).toBe(1);
    });

    await Effect.runPromise(program);
  });

  test.todo('follow up intents');
});
