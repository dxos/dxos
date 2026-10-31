//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { loadEffectModule } from './compile.ts';
import { isInstance3D, isOverlayItem, isShape2D } from './items.ts';
import { hashSeed, seeded } from './random.ts';
import { EffectRunner } from './runner.ts';
import { type EffectModule, type EffectStep } from './types.ts';

type Context = EffectStep & { label: string };

const context = (step: EffectStep): Context => ({ ...step, label: 'test' });

const isNumber = (value: unknown): value is number => typeof value === 'number';

describe('EffectRunner', () => {
  test('a stateful effect gives the same output for the same time, however it was reached', ({ expect }) => {
    const walk: EffectModule<Context, number> = {
      init: () => 0,
      step: (state, ctx) => Number(state) + ctx.random(),
      draw: (state) => [Number(state)],
    };
    const forward = new EffectRunner(walk, { seed: 7 });
    const ahead = [0.5, 3, 5].map((t) => forward.frame(t, context).output[0]);
    const backward = new EffectRunner(walk, { seed: 7 });
    const behind = [5, 3, 0.5].map((t) => backward.frame(t, context).output[0]).reverse();
    expect(behind).toEqual(ahead);
    expect(forward.checkpoints).toBeGreaterThan(1);
  });

  test('a stateless effect is sampled with a random seeded by the time', ({ expect }) => {
    const noise: EffectModule<Context, number> = { sample: (ctx) => [ctx.random()] };
    const runner = new EffectRunner(noise, { seed: 1 });
    expect(runner.frame(1, context).output).toEqual(runner.frame(1, context).output);
    expect(runner.frame(1, context).output).not.toEqual(runner.frame(2, context).output);
  });

  test('items the host does not accept are dropped', ({ expect }) => {
    const mixed: EffectModule<Context, number> = { sample: () => [1, 2] };
    const runner = new EffectRunner(mixed, { seed: 1, accept: (value): value is number => value === 1 });
    expect(runner.frame(0, context).output).toEqual([1]);
  });

  test('an error pauses the effect with its message; reset starts it over', ({ expect }) => {
    const failing: EffectModule<Context, number> = {
      sample: () => {
        throw new Error('boom');
      },
    };
    const runner = new EffectRunner(failing, { seed: 1 });
    expect(runner.frame(0, context).status).toEqual({ state: 'paused', reason: 'error', message: 'boom' });
    runner.reset();
    expect(runner.status).toEqual({ state: 'running' });
  });

  test('an effect over its step budget pauses', ({ expect }) => {
    let clock = 0;
    const slow: EffectModule<Context, number> = {
      init: () => 0,
      step: (state) => Number(state) + 1,
      draw: (state) => [Number(state)],
    };
    const runner = new EffectRunner(slow, { seed: 1, budgetMs: 1, now: () => (clock += 5) });
    expect(runner.frame(2, context).status).toMatchObject({ state: 'paused', reason: 'budget' });
  });
});

describe('loadEffectModule', () => {
  test('a module sees only the injected modules, and no clock or Math.random', ({ expect }) => {
    const helper = { double: (value: number) => value * 2 };
    const module = loadEffectModule<Context, number>(
      `const { double } = require('helper');
      exports.default = { sample: () => [double(2), typeof Date, typeof fetch] };`,
      { modules: { helper } },
    );
    const runner = new EffectRunner(module, { seed: 1 });
    expect(runner.frame(0, context).output).toEqual([4, 'undefined', 'undefined']);
    expect(() => loadEffectModule(`require('fs')`, { modules: { helper } })).toThrow(/may import only 'helper'/);
    const random = loadEffectModule<Context, number>(`exports.default = { sample: () => [Math.random()] };`, {
      modules: {},
    });
    expect(new EffectRunner(random, { seed: 1, accept: isNumber }).frame(0, context).status.state).toBe('paused');
    expect(() => loadEffectModule(`exports.x = 1;`, { modules: {}, define: 'defineEffect' })).toThrow(/defineEffect/);
  });
});

describe('random', () => {
  test('a seeded random repeats from its saved state, and seeds hash stably', ({ expect }) => {
    const random = seeded(42);
    random();
    const saved = random.state();
    const next = [random(), random()];
    const resumed = seeded(saved);
    expect([resumed(), resumed()]).toEqual(next);
    expect(hashSeed('node-1')).toBe(hashSeed('node-1'));
    expect(hashSeed('node-1')).not.toBe(hashSeed('node-2'));
  });
});

describe('items', () => {
  test('each renderer keeps only its own items', ({ expect }) => {
    const circle = { kind: 'circle', center: { x: 0, y: 0 }, radius: 1 };
    const sphere = { primitive: 'sphere', position: { x: 0, y: 1, z: 2 }, scale: 1, color: '#fff', opacity: 1 };
    const thread = { kind: 'thread', id: 't', anchor: { target: 'a' }, messages: [], opacity: 1 };
    expect([circle, sphere, thread].filter(isShape2D)).toEqual([circle]);
    expect([circle, sphere, thread, { ...sphere, position: { x: 0 } }].filter(isInstance3D)).toEqual([sphere]);
    expect([circle, sphere, thread, { kind: 'card' }].filter(isOverlayItem)).toEqual([thread]);
  });
});
