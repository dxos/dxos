//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { runAndForwardErrors } from '@dxos/effect';

import { createIntent } from './intent';
import { type AnyIntentResolver, createDispatcher, createResolver } from './intent-dispatcher';

describe('Intent dispatcher', () => {
  test('throws error if no resolver found', async ({ expect }) => {
    const { dispatchPromise } = createDispatcher(() => []);
    const { data, error } = await dispatchPromise(createIntent(ToString, { value: 1 }));

    expect(data).toBe(undefined);
    expect(error).toBeInstanceOf(Error);
  });

  test('matches intent to resolver and executes', async ({ expect }) => {
    const { dispatchPromise } = createDispatcher(() => [toStringResolver]);
    const { data, error } = await dispatchPromise(createIntent(ToString, { value: 1 }));

    expect(error).toBe(undefined);
    expect(data?.string).toBe('1');
  });

  test('update resolvers', async ({ expect }) => {
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

  test('compose intent effects', async ({ expect }) => {
    const { dispatch } = createDispatcher(() => [computeResolver]);
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 1 }));
      const b = yield* dispatch(createIntent(Compute, { value: 2 }));
      return b.value - a.value;
    });

    expect(await runAndForwardErrors(program)).toBe(2);
  });

  test('concurrent intent effects', async ({ expect }) => {
    const { dispatch } = createDispatcher(() => [computeResolver]);
    const program = Effect.gen(function* () {
      const fiberA = yield* Effect.fork(dispatch(createIntent(Compute, { value: 5 })));
      const fiberB = yield* Effect.fork(dispatch(createIntent(Compute, { value: 2 })));
      const [a, b] = yield* Fiber.join(Fiber.zip(fiberA, fiberB));
      return b.value - a.value;
    });

    expect(await runAndForwardErrors(program)).toBe(-6);
  });

  test('mix & match intent effects with promises', async ({ expect }) => {
    const { dispatch, dispatchPromise } = createDispatcher(() => [toStringResolver, computeResolver]);
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 2 }));
      const b = yield* dispatch(createIntent(ToString, { value: a.value }));
      return b.string;
    });

    expect(await runAndForwardErrors(program)).toBe('4');

    const a = await dispatchPromise(createIntent(Compute, { value: 2 }));
    const b = await dispatchPromise(createIntent(ToString, { value: a.data!.value }));

    expect(b.data?.string).toBe('4');
  });

  test('undo intent', async ({ expect }) => {
    const { dispatch, undo } = createDispatcher(() => [computeResolver]);
    const program = Effect.gen(function* () {
      const a = yield* dispatch(createIntent(Compute, { value: 2 }));

      expect(a.value).toBe(4);

      const b = yield* undo();

      expect(b.value).toBe(2);
    });

    await runAndForwardErrors(program);
  });

  test('filter resolvers by predicate', async ({ expect }) => {
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

    await runAndForwardErrors(program);
  });

  test('hoist resolvers', async ({ expect }) => {
    const hoistedComputeResolver = createResolver({
      intent: Compute,
      position: 'hoist',
      resolve: async (data) => ({ data: { value: data?.value * 3 } }),
    });
    const { dispatchPromise } = createDispatcher(() => [computeResolver, hoistedComputeResolver]);
    const { data } = await dispatchPromise(createIntent(Compute, { value: 1 }));
    expect(data?.value).toBe(3);
  });

  test('fallback resolvers', async ({ expect }) => {
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

    await runAndForwardErrors(program);
  });

  test('non-struct inputs & outputs', async ({ expect }) => {
    const { dispatchPromise } = createDispatcher(() => [addResolver]);
    const { data } = await dispatchPromise(createIntent(Add, [1, 1]));
    expect(data).toBe(2);
  });

  test('empty inputs & outputs', async ({ expect }) => {
    const { dispatchPromise } = createDispatcher(() => [sideEffectResolver]);
    const { data } = await dispatchPromise(createIntent(SideEffect));
    expect(data).toBe(undefined);
  });

  test('follow up intents', async ({ expect }) => {
    const followUpResolver = createResolver({
      intent: Compute,
      resolve: async (data) => ({
        data: { value: data.value * 2 },
        intents: [createIntent(ToString, { value: data.value * 2 })],
      }),
    });
    let toStringCalled = false;
    const trackingToStringResolver = createResolver({
      intent: ToString,
      resolve: async (data) => {
        toStringCalled = true;
        return { data: { string: data.value.toString() } };
      },
    });

    const { dispatchPromise } = createDispatcher(() => [followUpResolver, trackingToStringResolver]);
    const { data } = await dispatchPromise(createIntent(Compute, { value: 5 }));

    expect(data?.value).toBe(10);
    expect(toStringCalled).toBe(true);
  });
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
  resolve: (data, undo) => {
    return Effect.gen(function* () {
      if (undo) {
        return { data: { value: data.value / 2 } };
      }

      yield* Effect.sleep(data.value * 10);
      const value = data.value * 2;
      return { data: { value }, undoable: { message: 'test', data: { value } } };
    });
  },
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
