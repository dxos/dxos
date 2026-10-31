//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createEsbuildCompiler } from '@dxos/animation';
import { type GeneratorNode } from '@dxos/scene';

import { type RenderList2D } from '../model/index.ts';
import { pathBounds } from '../utils/index.ts';
import { checkGenerator } from './check.ts';
import { loadGenerator } from './compile.ts';
import { GeneratorHost } from './host.ts';
import { along, andThen, jitter, orbit, seeded, settle } from './motion.ts';
import { GeneratorRunner } from './runner.ts';
import { type GeneratorModule } from './types.ts';

const generatorNode: GeneratorNode = {
  type: 'generator',
  id: 'g',
  z: 'a',
  center: { x: 0, y: 0 },
  size: { width: 200, height: 200 },
  generator: 'drift',
  params: { count: 8, target: 'box' },
};

const scene: RenderList2D = {
  id: 's',
  nodes: {
    g: generatorNode,
    box: { type: 'rect', id: 'box', z: 'b', center: { x: 100, y: 0 }, size: { width: 50, height: 50 } },
  },
  links: {},
};

type Body = { x: number; y: number };

/** The state as bodies: the runner holds it as plain, untyped data. */
const bodies = (state: unknown): Body[] =>
  Array.isArray(state)
    ? state.filter((body): body is Body => typeof body?.x === 'number' && typeof body?.y === 'number')
    : [];

/** Bodies that wander from random starts towards the bound box: state, steps and random draws all matter. */
const drift: GeneratorModule = {
  init: (ctx) =>
    Array.from({ length: Number(ctx.params.count) }, () => ({
      x: ctx.random() * 200 - 100,
      y: ctx.random() * 200 - 100,
    })),
  step: (state, ctx) => {
    const [target] = ctx.bound.target ?? [];
    const goal = target && 'center' in target ? target.center : { x: 0, y: 0 };
    return bodies(state).map((body) => ({
      x: body.x + (goal.x - body.x) * ctx.dt + (ctx.random() - 0.5),
      y: body.y + (goal.y - body.y) * ctx.dt + (ctx.random() - 0.5),
    }));
  },
  draw: (state) => bodies(state).map((body) => ({ kind: 'circle', center: body, radius: 2 })),
};

const schema = { type: 'object', properties: { target: { 'type': 'string', 'x-binding': 'node' } } };
const input = { scene, node: 'g', schema };

describe('GeneratorRunner', () => {
  test('the same time gives the same shapes, however it was reached', ({ expect }) => {
    const forward = new GeneratorRunner(drift, { seed: 7 });
    const at = [0, 1, 2.5, 4, 5.25].map((t) => JSON.stringify(forward.frame(t, input).shapes));
    // Scrubbing back restores from a checkpoint rather than replaying from the start.
    expect(forward.checkpoints).toBe(3);
    expect(JSON.stringify(forward.frame(2.5, input).shapes)).toBe(at[2]);
    const backward = new GeneratorRunner(drift, { seed: 7 });
    expect([5.25, 4, 2.5, 1, 0].map((t) => JSON.stringify(backward.frame(t, input).shapes)).reverse()).toEqual(at);
    // A different seed is a different run.
    expect(JSON.stringify(new GeneratorRunner(drift, { seed: 8 }).frame(1, input).shapes)).not.toBe(at[1]);
  });

  test('times on the frame grid land on whole steps', ({ expect }) => {
    const runner = new GeneratorRunner(drift, { seed: 1 });
    const one = JSON.stringify(runner.frame(10 / 30, input).shapes);
    expect(JSON.stringify(new GeneratorRunner(drift, { seed: 1 }).frame(40 / 120, input).shapes)).toBe(one);
  });

  test('bindings are read from the scene as the host draws it', ({ expect }) => {
    const box = scene.nodes.box;
    const moved: RenderList2D = { ...scene, nodes: { ...scene.nodes, box: { ...box, center: { x: -100, y: 0 } } } };
    const still = new GeneratorRunner(drift, { seed: 3 }).frame(2, input).shapes;
    const followed = new GeneratorRunner(drift, { seed: 3 }).frame(2, { ...input, scene: moved }).shapes;
    expect(JSON.stringify(followed)).not.toBe(JSON.stringify(still));
  });

  test('a throwing generator pauses with its error', ({ expect }) => {
    const broken: GeneratorModule = {
      sample: () => {
        throw new Error('boom');
      },
    };
    const runner = new GeneratorRunner(broken, { seed: 1 });
    expect(runner.frame(0, input)).toMatchObject({
      shapes: [],
      status: { state: 'paused', reason: 'error', message: 'boom' },
    });
  });

  test('a generator over its step budget pauses', ({ expect }) => {
    let clock = 0;
    const slow: GeneratorModule = {
      ...drift,
      step: (state, ctx) => {
        clock += 10;
        return drift.step(state, ctx);
      },
    };
    const runner = new GeneratorRunner(slow, { seed: 1, budgetMs: 4, now: () => clock });
    expect(runner.frame(1, input).status).toMatchObject({ state: 'paused', reason: 'budget' });
  });
});

describe('loadGenerator', () => {
  test('a module sees only the motion library and has no clock, network or Math.random', ({ expect }) => {
    const module = loadGenerator(`
      const motion = require('@dxos/react-ui-canvas/motion');
      exports.default = { sample: (ctx) => [{ kind: 'circle', center: motion.orbit({ x: 0, y: 0 }, { radius: 1, period: 1 })(ctx.t).position, radius: typeof fetch === 'undefined' && typeof Date === 'undefined' ? 1 : 0 }] };
    `);
    const runner = new GeneratorRunner(module, { seed: 1 });
    expect(runner.frame(0, input).shapes).toEqual([{ kind: 'circle', center: { x: 1, y: 0 }, radius: 1 }]);
    expect(() => loadGenerator(`require('fs')`)).toThrow(/may import only/);
    const random = loadGenerator(
      `exports.default = { sample: () => [{ kind: 'circle', center: { x: Math.random(), y: 0 }, radius: 1 }] }`,
    );
    expect(new GeneratorRunner(random, { seed: 1 }).frame(0, input).status).toMatchObject({ state: 'paused' });
  });

  test('esbuild compiles a TypeScript module that imports the motion library', async ({ expect }) => {
    const compile = createEsbuildCompiler();
    const result = await compile(`
      import { defineGenerator, settle } from '@dxos/react-ui-canvas/motion';
      type Params = { count: number };
      export default defineGenerator<Params>({
        sample: (ctx) => [{ kind: 'circle', center: settle({ x: 0, y: 0 }, { x: 10, y: 0 }, { duration: 1 })(ctx.t).position, radius: ctx.params.count }],
      });
    `);
    expect(result.errors).toBeUndefined();
    const module = loadGenerator(result.code ?? '');
    expect(new GeneratorRunner(module, { seed: 1 }).frame(1, input).shapes).toEqual([
      { kind: 'circle', center: { x: 10, y: 0 }, radius: 8 },
    ]);
    expect((await compile('export default {')).errors?.length).toBeGreaterThan(0);
  });
});

describe('checkGenerator', () => {
  test('reports timings, determinism and a contact sheet', async ({ expect }) => {
    const source = `
      export default {
        init: (ctx) => ({ x: 0 }),
        step: (state, ctx) => ({ x: state.x + ctx.random() }),
        draw: (state) => [{ kind: 'circle', center: { x: state.x, y: 0 }, radius: 4 }],
      };
    `;
    const report = await checkGenerator({
      compile: createEsbuildCompiler(),
      source,
      scene,
      node: 'g',
      times: [0, 1, 2, 3],
    });
    expect(report.errors).toBeUndefined();
    expect(report.deterministic).toBe(true);
    expect(report.frames).toEqual([0, 1, 2, 3].map((t) => ({ t, shapes: 1 })));
    expect(report.sheet).toMatch(/^<svg/);
  });
});

describe('GeneratorHost', () => {
  test('answers the latest time asked for, in-process without a worker', async ({ expect }) => {
    const frames: number[] = [];
    const done = new Promise<void>((resolve) => {
      const host = new GeneratorHost({
        compile: async () => ({
          code: `exports.default = { sample: (ctx) => [{ kind: 'circle', center: { x: ctx.t, y: 0 }, radius: 1 }] }`,
        }),
        onFrames: ({ t, frames: byNode }) => {
          frames.push(t);
          expect(byNode.g.shapes).toEqual([{ kind: 'circle', center: { x: t, y: 0 }, radius: 1 }]);
          if (t === 3) {
            host.dispose();
            resolve();
          }
        },
      });
      host.update(scene, { drift: { name: 'Drift', source: '', version: 1 } });
      host.request(1);
      host.request(2);
      host.request(3);
    });
    await done;
    // The request for 2 was replaced by 3 while 1 was in flight.
    expect(frames).toEqual([1, 3]);
  });
});

describe('motion', () => {
  test('along, settle, then, orbit and jitter are pure functions of time', ({ expect }) => {
    const line = along('M 0 0 L 100 0', { speed: 50 });
    expect(line(1).position).toEqual({ x: 50, y: 0 });
    expect(line(3)).toMatchObject({ position: { x: 100, y: 0 }, done: true });
    const chained = andThen(
      settle({ x: 0, y: 0 }, { x: 10, y: 0 }, { duration: 1, easing: 'linear' }),
      orbit({ x: 10, y: 0 }, { radius: 5, period: 4 }),
    );
    expect(chained(0.5).position.x).toBeCloseTo(5);
    expect(chained(1 + 1).position.x).toBeCloseTo(10, 4);
    const wander = jitter(line, { amplitude: 3, seed: 2 });
    expect(wander(1)).toEqual(wander(1));
    expect(Math.abs(wander(1).position.y)).toBeLessThanOrEqual(3);
  });

  test('a seeded random repeats from its saved state', ({ expect }) => {
    const random = seeded(42);
    random();
    const resumed = seeded(random.state());
    expect([random(), random()]).toEqual([resumed(), resumed()]);
  });

  test('path bounds follow curves, not control points', ({ expect }) => {
    const bounds = pathBounds('M 0 0 C 0 100 100 100 100 0');
    expect(bounds?.height).toBeCloseTo(75, 0);
  });
});
