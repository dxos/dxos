//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createTimeline, setKey } from '@dxos/animation';
import { Ref } from '@dxos/echo';

import { Animation, type AnimatorCapabilities } from '#types';

import { bindingAt, bindingTrack, resolveBound } from './binding.ts';
import { BUILTIN_EFFECTS } from './builtins/index.ts';
import { checkEffect, syntheticBinding } from './check.ts';
import { effectCompiler } from './compiler.ts';
import { EffectCore } from './core.ts';
import { effectJobs, placedEffects } from './shot.ts';

/** Parameters that make each built-in draw within a few seconds of the synthetic ring. */
const PARAMS: Record<string, Record<string, unknown>> = {
  'Packet flow': { count: 6, speed: 1, alert: 0.3, both: true },
  'Packet flow (3D)': { count: 6, speed: 1, boost: { objects: ['a'], count: 10, gap: [0.2, 0.4] } },
  'Burst': { at: 1, duration: 2 },
  'Burst (3D)': { at: 1, duration: 2 },
  'Conversations': { rate: 4, max: 3 },
  'Callout': { object: 'a', title: 'Alpha', label: 'Space', rows: [['Members', '3']], messages: ['Hi', 'Hello'] },
};

describe('built-in effects', () => {
  for (const effect of BUILTIN_EFFECTS) {
    test(`${effect.name} is deterministic and draws ${effect.renderer} items`, async ({ expect }) => {
      const report = await checkEffect({
        compile: effectCompiler,
        source: effect.source,
        renderer: effect.renderer,
        params: PARAMS[effect.name] ?? {},
        schema: effect.params,
        duration: 6,
        times: [0.5, 1.5, 2, 3.25, 4.5, 5.75],
      });
      expect(report.errors).toBeUndefined();
      expect(report.status).toEqual({ state: 'running' });
      expect(report.deterministic).toBe(true);
      expect(report.frames?.some((frame) => frame.items > 0)).toBe(true);
    });
  }

  test('a 2d effect returns shapes and a 3d one instances from the same source', async ({ expect }) => {
    const [flat, deep] = BUILTIN_EFFECTS.filter((effect) => effect.name.startsWith('Burst'));
    const run = async (effect: (typeof BUILTIN_EFFECTS)[number]) => {
      const compiled = await effectCompiler(effect.source);
      const core = new EffectCore();
      core.handle({ type: 'load', key: 'burst@1', code: compiled.code ?? '' });
      core.handle({
        type: 'shot',
        binding: bindingTrack(2, syntheticBinding, 1),
        jobs: [
          {
            instance: 'x',
            key: 'burst@1',
            renderer: effect.renderer,
            params: { duration: 1 },
            schema: effect.params,
            seed: 1,
            start: 0,
            end: 2,
            tracks: [],
          },
        ],
      });
      return core.frames(0.5)[0];
    };
    const shapes = await run(flat);
    const instances = await run(deep);
    expect(shapes.renderer === '2d' && shapes.items[0]?.kind).toBe('circle');
    expect(instances.renderer === '3d' && instances.items[0]?.primitive).toBe('sphere');
    expect(shapes.items).toHaveLength(4 * 12);
  });

  test('a keyed parameter applies at its time', async ({ expect }) => {
    const burst = BUILTIN_EFFECTS.find((effect) => effect.name === 'Burst');
    expect(burst).toBeDefined();
    if (!burst) {
      return;
    }
    let timeline = createTimeline(4);
    timeline = setKey(timeline, 'effect:x', 'particles', { t: 0, value: 2 });
    timeline = setKey(timeline, 'effect:x', 'particles', { t: 4, value: 2 });
    const { jobs, sources } = effectJobs(
      placedEffects({ duration: 4, effects: [] }, [
        {
          effect: { id: 'x', effect: Ref.make(Animation.makeEffect(burst)), params: { duration: 3 } },
          start: 1,
          end: 4,
        },
      ]),
      timeline,
      () => ({ id: 'burst', version: 1, renderer: '2d', source: burst.source, params: burst.params }),
    );
    expect(jobs[0]).toMatchObject({ key: 'burst@1', start: 1, end: 4, tracks: [{ property: 'particles' }] });
    const core = new EffectCore();
    core.handle({ type: 'load', key: 'burst@1', code: (await effectCompiler(sources['burst@1'])).code ?? '' });
    core.handle({ type: 'shot', binding: bindingTrack(4, syntheticBinding, 1), jobs });
    expect(core.frames(0.5)).toEqual([]);
    expect(core.frames(2)[0].items).toHaveLength(4 * 2);
  });
});

describe('bindings', () => {
  const at = (x: number): AnimatorCapabilities.StageBinding => ({
    objects: { a: { id: 'a', position: { x, y: 0, z: 0 }, radius: 1, opacity: 1 } },
    links: [{ id: 'l', from: 'a', to: 'a', points: [{ x, y: 0, z: 0 }] }],
  });

  test('bindings sampled across a shot read between samples by interpolation', ({ expect }) => {
    const track = bindingTrack(1, (t) => at(t * 10), 2);
    expect(track.frames).toHaveLength(3);
    expect(bindingAt(track, 0.25).objects.a.position.x).toBeCloseTo(2.5);
    expect(bindingAt(track, 0.25).links[0].points[0].x).toBeCloseTo(2.5);
    expect(bindingAt(track, 9).objects.a.position.x).toBe(10);
  });

  test('a binding names objects or links; unset binds all, unknown ids bind nothing', ({ expect }) => {
    const binding = syntheticBinding();
    const kinds = { objects: 'object', links: 'link' } as const;
    expect(resolveBound(binding, {}, kinds).objects).toHaveLength(4);
    expect(resolveBound(binding, { objects: ['a', 'z'] }, kinds).objects).toHaveLength(1);
    expect(resolveBound(binding, { links: 'a-b' }, kinds).links).toHaveLength(1);
  });
});
