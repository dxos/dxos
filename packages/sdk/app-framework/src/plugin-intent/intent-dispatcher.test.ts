//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { chain, createIntent } from './intent';
import { type AnyIntentResolver, createDispatcher, createResolver } from './intent-dispatcher';

describe('Intent dispatcher', () => {
  test('throws error if no resolver found', async () => {
    const { dispatchPromise } = createDispatcher(() => []);
    const { data, error } = await dispatchPromise(createIntent(ToString, { value: 1 }));

    expect(data).toBe(undefined);
    expect(error).toBeInstanceOf(Error);
  });

  test('matches intent to resolver and executes', async () => {
    const { dispatchPromise } = createDispatcher(() => [toStringResolver]);
    const { data, error } = await dispatchPromise(createIntent(ToString, { value: 1 }));

    expect(error).toBe(undefined);
    expect(data?.string).toBe('1');
  });

  test('update resolvers', async () => {
    const resolvers: AnyIntentResolver[] = [];
    const { dispatchPromise } = createDispatcher(() => resolvers);
    const { error } = await dispatchPromise(createIntent(ToString, { value: 1 }));

    expect(error).toBeInstanceOf(Error);

    resolvers.push(toStringResolver);

    const { data } = await dispatchPromise(createIntent(ToString, { value: 1 }));

    expect(data?.string).toBe('1');

    resolvers.splice(resolvers.indexOf(toStringResolver), 1);

    {
      const { data, error } = await dispatchPromise(createIntent(ToString, { value: 1 }));

      expect(data).toBe(undefined);
      expect(error).toBeInstanceOf(Error);
    }
  });

  test('compose intent effects', async () => {
    const { dispatch } = createDispatcher(() => [computeResolver]);
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 1 }));
      const b = yield* dispatch(createIntent(Compute, { value: 2 }));
      return b.value - a.value;
    });

    expect(await Effect.runPromise(program)).toBe(2);
  });

  test('concurrent intent effects', async () => {
    const { dispatch } = createDispatcher(() => [computeResolver]);
    const program = Effect.gen(function* () {
      const fiberA = yield* Effect.fork(dispatch(createIntent(Compute, { value: 5 })));
      const fiberB = yield* Effect.fork(dispatch(createIntent(Compute, { value: 2 })));
      const [a, b] = yield* Fiber.join(Fiber.zip(fiberA, fiberB));
      return b.value - a.value;
    });

    expect(await Effect.runPromise(program)).toBe(-6);
  });

  test('mix & match intent effects with promises', async () => {
    const { dispatch, dispatchPromise } = createDispatcher(() => [toStringResolver, computeResolver]);
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 2 }));
      const b = yield* dispatch(createIntent(ToString, { value: a.value }));
      return b.string;
    });

    expect(await Effect.runPromise(program)).toBe('4');

    const a = await dispatchPromise(createIntent(Compute, { value: 2 }));
    const b = await dispatchPromise(createIntent(ToString, { value: a.data!.value }));

    expect(b.data?.string).toBe('4');
  });

  test('undo intent', async () => {
    const { dispatch, undo } = createDispatcher(() => [computeResolver]);
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 2 }));

      expect(a.value).toBe(4);

      const b = yield* undo();

      expect(b.value).toBe(2);
    });

    await Effect.runPromise(program);
  });

  test('chain intents', async () => {
    const { dispatch } = createDispatcher(() => [computeResolver, toStringResolver, concatResolver]);
    const intent = Function.pipe(
      createIntent(Compute, { value: 1 }),
      chain(ToString, {}),
      chain(Concat, { plus: '!' }),
    );

    expect(intent.first.id).toBe(Compute._tag);
    expect(intent.last.id).toBe(Concat._tag);
    expect(intent.all.length).toBe(3);

    const program = Effect.gen(function* () {
      const data = yield* dispatch(intent);
      return data.string;
    });

    expect(await Effect.runPromise(program)).toBe('2!');
  });

  test('undo chained intent', async () => {
    const { dispatch, undo } = createDispatcher(() => [computeResolver, toStringResolver, concatResolver]);
    const intent = Function.pipe(createIntent(Compute, { value: 1 }), chain(Compute, {}), chain(Compute, {}));
    const program = Effect.gen(function* () {
      const a = yield* dispatch(intent);

      expect(a.value).toBe(8);

      const b = yield* undo();

      expect(b.value).toBe(1);
    });

    await Effect.runPromise(program);
  });

  test('filter resolvers by predicate', async () => {
    const conditionalComputeResolver = createResolver({
      intent: Compute,
      filter: (data): data is { value: number } => data?.value > 1,
      resolve: async (data) => ({ data: { value: data?.value * 3 } }),
    });
    const { dispatch } = createDispatcher(() => [conditionalComputeResolver, computeResolver]);
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 1 }));

      expect(a.value).toBe(2);

      const b = yield* dispatch(createIntent(Compute, { value: 2 }));

      expect(b.value).toBe(6);
    });

    await Effect.runPromise(program);
  });

  test('hoist resolvers', async () => {
    const hoistedComputeResolver = createResolver({
      intent: Compute,
      position: 'hoist',
      resolve: async (data) => ({ data: { value: data?.value * 3 } }),
    });
    const { dispatchPromise } = createDispatcher(() => [computeResolver, hoistedComputeResolver]);
    const { data } = await dispatchPromise(createIntent(Compute, { value: 1 }));
    expect(data?.value).toBe(3);
  });

  test('fallback resolvers', async () => {
    const conditionalComputeResolver = createResolver({
      intent: Compute,
      filter: (data): data is { value: number } => data?.value === 1,
      resolve: async (data) => ({ data: { value: data?.value * 2 } }),
    });
    const fallbackComputeResolver = createResolver({
      intent: Compute,
      position: 'fallback',
      resolve: async (data) => ({ data: { value: data?.value * 3 } }),
    });
    const { dispatch } = createDispatcher(() => [conditionalComputeResolver, fallbackComputeResolver]);
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 1 }));

      expect(a.value).toBe(2);

      const b = yield* dispatch(createIntent(Compute, { value: 2 }));

      expect(b.value).toBe(6);
    });

    await Effect.runPromise(program);
  });

  test('non-struct inputs & outputs', async () => {
    const { dispatchPromise } = createDispatcher(() => [addResolver]);
    const { data } = await dispatchPromise(createIntent(Add, [1, 1]));
    expect(data).toBe(2);
  });

  test('empty inputs & outputs', async () => {
    const { dispatchPromise } = createDispatcher(() => [sideEffectResolver]);
    const { data } = await dispatchPromise(createIntent(SideEffect));
    expect(data).toBe(undefined);
  });

  test.todo('follow up intents');
});

class ToString extends Schema.TaggedClass<ToString>()('ToString', {
  input: Schema.Struct({
    value: Schema.Number,
  }),
  output: Schema.Struct({
    string: Schema.String,
  }),
}) {}

const toStringResolver = createResolver({
  intent: ToString,
  resolve: async (data) => ({ data: { string: data.value.toString() } }),
});

class Compute extends Schema.TaggedClass<Compute>()('Compute', {
  input: Schema.Struct({
    value: Schema.Number,
  }),
  output: Schema.Struct({
    value: Schema.Number,
  }),
}) {}

const computeResolver = createResolver({
  intent: Compute,
  resolve: (data, undo) =>
    Effect.gen(function* () {
      if (undo) {
        return { data: { value: data.value / 2 } };
      }

      yield* Effect.sleep(data.value * 10);
      const value = data.value * 2;
      return { data: { value }, undoable: { message: 'test', data: { value } } };
    }),
});

class Concat extends Schema.TaggedClass<Concat>()('Concat', {
  input: Schema.Struct({
    string: Schema.String,
    plus: Schema.String,
  }),
  output: Schema.Struct({
    string: Schema.String,
  }),
}) {}

const concatResolver = createResolver({
  intent: Concat,
  resolve: async (data) => ({ data: { string: data.string + data.plus } }),
});

class Add extends Schema.TaggedClass<Add>()('Add', {
  input: Schema.Tuple(Schema.Number, Schema.Number),
  output: Schema.Number,
}) {}

const addResolver = createResolver({
  intent: Add,
  resolve: async (data) => ({ data: data[0] + data[1] }),
});

class SideEffect extends Schema.TaggedClass<SideEffect>()('SideEffect', {
  input: Schema.Void,
  output: Schema.Void,
}) {}

const sideEffectResolver = createResolver({
  intent: SideEffect,
  resolve: async () => {},
});
