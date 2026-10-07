//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect, test } from 'vitest';

import * as EffectEx from './EffectEx.ts';

//
// Effect 4 shares the layer memo map across `Effect.provide` calls, where v3 gave each call its own.
// These pin the two properties the migration audit turned on: test isolation still holds (each root
// run rebuilds), and only repeated provides *within one run* are deduplicated. Use `Layer.fresh` or
// `Effect.provide(layer, { local: true })` where a second instance is actually wanted.
//

class Counter extends Context.Service<Counter, { readonly id: number }>()('@dxos/effect/test/Counter') {}

let builds = 0;
const CounterLayer = Layer.effect(
  Counter,
  Effect.sync(() => ({ id: ++builds })),
);

const read = Effect.map(Counter, (counter) => counter.id);

test('separate root runs each build the layer', async () => {
  const a = await EffectEx.runPromise(read.pipe(Effect.provide(CounterLayer)));
  const b = await EffectEx.runPromise(read.pipe(Effect.provide(CounterLayer)));
  expect([a, b]).toEqual([1, 2]);
});

test('two provides within one run share the build', async () => {
  builds = 0;
  const inner = read.pipe(Effect.provide(CounterLayer));
  const outer = Effect.all([inner, read]).pipe(Effect.provide(CounterLayer));
  const [x, y] = await EffectEx.runPromise(outer);
  expect([x, y, builds]).toEqual([1, 1, 1]);
});
