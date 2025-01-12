//
// Copyright 2024 DXOS.org
//

import { Effect, Fiber, pipe } from 'effect';
import { describe, expect, test } from 'vitest';

import { S } from '@dxos/echo-schema';

import { chain, createIntent } from './intent';
import { createDispatcher, createResolver } from './intent-dispatcher';

describe('Intent dispatcher', () => {
  test('throws error if no resolver found', async () => {
    const { dispatchPromise } = createDispatcher({});
    const { data, error } = await dispatchPromise(createIntent(ToString, { value: 1 }));

    expect(data).toBe(undefined);
    expect(error).toBeInstanceOf(Error);
  });

  test('matches intent to resolver and executes', async () => {
    const { dispatchPromise } = createDispatcher({ test: [toStringResolver] });
    const { data, error } = await dispatchPromise(createIntent(ToString, { value: 1 }));

    expect(error).toBe(undefined);
    expect(data?.string).toBe('1');
  });

  test('update resolvers', async () => {
    const { dispatchPromise, registerResolver } = createDispatcher({ test: [] });
    const { error } = await dispatchPromise(createIntent(ToString, { value: 1 }));

    expect(error).toBeInstanceOf(Error);

    const removeResolver = registerResolver('test', toStringResolver);

    const { data } = await dispatchPromise(createIntent(ToString, { value: 1 }));

    expect(data?.string).toBe('1');

    removeResolver();

    {
      const { data, error } = await dispatchPromise(createIntent(ToString, { value: 1 }));

      expect(data).toBe(undefined);
      expect(error).toBeInstanceOf(Error);
    }
  });

  test('compose intent effects', async () => {
    const { dispatch } = createDispatcher({ test: [computeResolver] });
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 1 }));
      const b = yield* dispatch(createIntent(Compute, { value: 2 }));
      return b.data!.value - a.data!.value;
    });

    expect(await Effect.runPromise(program)).toBe(2);
  });

  test('concurrent intent effects', async () => {
    const { dispatch } = createDispatcher({ test: [computeResolver] });
    const program = Effect.gen(function* () {
      const fiberA = yield* Effect.fork(dispatch(createIntent(Compute, { value: 5 })));
      const fiberB = yield* Effect.fork(dispatch(createIntent(Compute, { value: 2 })));
      const [a, b] = yield* Fiber.join(Fiber.zip(fiberA, fiberB));
      return b.data!.value - a.data!.value;
    });

    expect(await Effect.runPromise(program)).toBe(-6);
  });

  test('mix & match intent effects with promises', async () => {
    const { dispatch, dispatchPromise } = createDispatcher({ test: [toStringResolver, computeResolver] });
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 2 }));
      const b = yield* dispatch(createIntent(ToString, { value: a.data!.value }));
      return b.data?.string;
    });

    expect(await Effect.runPromise(program)).toBe('4');

    const a = await dispatchPromise(createIntent(Compute, { value: 2 }));
    const b = await dispatchPromise(createIntent(ToString, { value: a.data!.value }));

    expect(b.data?.string).toBe('4');
  });

  test('undo intent', async () => {
    const { dispatch, undo } = createDispatcher({ test: [computeResolver] });
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 2 }));

      expect(a.data?.value).toBe(4);

      const b = yield* undo();

      expect(b?.data?.value).toBe(2);
    });

    await Effect.runPromise(program);
  });

  test('chain intents', async () => {
    const { dispatch } = createDispatcher({ test: [computeResolver, toStringResolver, concatResolver] });
    const intent = pipe(createIntent(Compute, { value: 1 }), chain(ToString, {}), chain(Concat, { plus: '!' }));

    expect(intent.first.action).toBe(Compute._tag);
    expect(intent.last.action).toBe(Concat._tag);
    expect(intent.all.length).toBe(3);

    const program = Effect.gen(function* () {
      const { data } = yield* dispatch(intent);
      return data?.string;
    });

    expect(await Effect.runPromise(program)).toBe('2!');
  });

  test('undo chained intent', async () => {
    const { dispatch, undo } = createDispatcher({ test: [computeResolver, toStringResolver, concatResolver] });
    const intent = pipe(createIntent(Compute, { value: 1 }), chain(Compute, {}), chain(Compute, {}));
    const program = Effect.gen(function* () {
      const a = yield* dispatch(intent);

      expect(a.data?.value).toBe(8);

      const b = yield* undo();

      expect(b?.data?.value).toBe(1);
    });

    await Effect.runPromise(program);
  });

  test('filter resolvers by plugin', async () => {
    const otherComputeResolver = createResolver(Compute, async (data) => ({ data: { value: data?.value * 3 } }));
    const { dispatch } = createDispatcher({ test: [computeResolver], other: [otherComputeResolver] });
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 1 }));

      expect(a.data?.value).toBe(2);

      const b = yield* dispatch(createIntent(Compute, { value: 1 }, { plugin: 'other' }));

      expect(b.data?.value).toBe(3);
    });

    await Effect.runPromise(program);
  });

  test('filter resolvers by predicate', async () => {
    const conditionalComputeResolver = createResolver(Compute, async (data) => ({ data: { value: data?.value * 3 } }), {
      filter: (data): data is { value: number } => data?.value > 1,
    });
    const { dispatch } = createDispatcher({ test: [conditionalComputeResolver, computeResolver] });
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 1 }));

      expect(a.data?.value).toBe(2);

      const b = yield* dispatch(createIntent(Compute, { value: 2 }));

      expect(b.data?.value).toBe(6);
    });

    await Effect.runPromise(program);
  });

  test('hoist resolvers', async () => {
    const hoistedComputeResolver = createResolver(Compute, async (data) => ({ data: { value: data?.value * 3 } }), {
      disposition: 'hoist',
    });
    const { dispatchPromise } = createDispatcher({ test: [computeResolver, hoistedComputeResolver] });
    const { data } = await dispatchPromise(createIntent(Compute, { value: 1 }));
    expect(data?.value).toBe(3);
  });

  test('fallback resolvers', async () => {
    const conditionalComputeResolver = createResolver(Compute, async (data) => ({ data: { value: data?.value * 2 } }), {
      filter: (data): data is { value: number } => data?.value === 1,
    });
    const fallbackComputeResolver = createResolver(Compute, async (data) => ({ data: { value: data?.value * 3 } }), {
      disposition: 'fallback',
    });
    const { dispatch } = createDispatcher({ test: [fallbackComputeResolver, conditionalComputeResolver] });
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 1 }));

      expect(a.data?.value).toBe(2);

      const b = yield* dispatch(createIntent(Compute, { value: 2 }));

      expect(b.data?.value).toBe(6);
    });

    await Effect.runPromise(program);
  });

  test('non-struct inputs & outputs', async () => {
    const { dispatchPromise } = createDispatcher({ test: [addResolver] });
    const { data } = await dispatchPromise(createIntent(Add, [1, 1]));
    expect(data).toBe(2);
  });

  test('empty inputs & outputs', async () => {
    const { dispatchPromise } = createDispatcher({ test: [sideEffectResolver] });
    const { data } = await dispatchPromise(createIntent(SideEffect));
    expect(data).toBe(undefined);
  });

  test.todo('follow up intents');
});

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

class Add extends S.TaggedClass<Add>()('Add', {
  input: S.Tuple(S.Number, S.Number),
  output: S.Number,
}) {}

const addResolver = createResolver(Add, async (data) => {
  return { data: data[0] + data[1] };
});

class SideEffect extends S.TaggedClass<SideEffect>()('SideEffect', {
  input: S.Void,
  output: S.Void,
}) {}

const sideEffectResolver = createResolver(SideEffect, async () => {});
