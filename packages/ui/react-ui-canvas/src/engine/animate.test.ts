//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { type Timeline, createClock, createTimeline, setKey } from '@dxos/animation';

import { ViewBuilder } from '../builder/index.ts';
import { type Intent, type View, createMemoryStore } from '../model/index.ts';
import { animate, rewriteIntent } from './animate.ts';
import { createFreehandProjection, reduceIntent } from './projection.ts';

const {
  views: [base],
} = ViewBuilder.view('s', [
  ViewBuilder.rect('a', { x: 0, y: 0, width: 100, height: 50 }),
  ViewBuilder.rect('b', { x: 200, y: 0, width: 100, height: 50 }),
]).build();

/** The scene and timeline after `intent` lands at `t`: keys on the timeline, the rest on the scene. */
const apply = (
  { scene, timeline }: { scene: View; timeline?: Timeline },
  intent: Intent,
  t: number,
  autoKey = true,
): { scene: View; timeline?: Timeline } => {
  const rewritten = rewriteIntent(scene, timeline, intent, t, { autoKey: () => autoKey });
  return { scene: rewritten.intent ? reduceIntent(scene, rewritten.intent) : scene, timeline: rewritten.timeline };
};

describe('rewriteIntent', () => {
  test('at t = 0 with no track, an intent passes through unchanged', ({ expect }) => {
    const intent: Intent = { kind: 'move', ids: ['a'], delta: { x: 10, y: 0 } };
    expect(rewriteIntent(base, undefined, intent, 0)).toEqual({ intent, timeline: undefined });
    expect(rewriteIntent(base, undefined, intent, 0).intent).toBe(intent);
  });

  test('away from t = 0, a move keys the centre at the playhead and leaves the base alone', ({ expect }) => {
    const next = apply({ scene: base }, { kind: 'move', ids: ['a', 'b'], delta: { x: 10, y: 5 } }, 2);
    expect(next.scene.nodes.a.center).toEqual(base.nodes.a.center);
    expect(next.timeline?.tracks['a:center'].keys).toEqual([{ t: 2, value: { x: 60, y: 30 } }]);
    expect(next.timeline?.tracks['b:center'].keys).toEqual([{ t: 2, value: { x: 260, y: 30 } }]);
  });

  test('a move keys from where the node is drawn at that time', ({ expect }) => {
    const timeline = setKey(createTimeline(), 'a', 'center', { t: 0, value: { x: 0, y: 0 } });
    const keyed = setKey(timeline, 'a', 'center', { t: 2, value: { x: 100, y: 0 } });
    const next = apply({ scene: base, timeline: keyed }, { kind: 'move', ids: ['a'], delta: { x: 0, y: 10 } }, 1);
    expect(next.timeline?.tracks['a:center'].keys[1]).toEqual({ t: 1, value: { x: 50, y: 10 } });
  });

  test('at t = 0 a property that has a track is keyed, not written to the base', ({ expect }) => {
    const timeline = setKey(createTimeline(), 'a', 'style.opacity', { t: 1, value: 1 });
    const next = apply(
      { scene: base, timeline },
      { kind: 'update', id: 'a', values: { style: { opacity: 0 }, label: 'A' } },
      0,
    );
    expect(next.timeline?.tracks['a:style.opacity'].keys).toEqual([
      { t: 0, value: 0 },
      { t: 1, value: 1 },
    ]);
    // A property that is not animatable goes to the base in the same step.
    expect(next.scene.nodes.a).toMatchObject({ label: 'A' });
    expect(next.scene.nodes.a.style?.opacity).toBeUndefined();
  });

  test('an edit of the whole style keys the opacity inside it and writes the rest to the base', ({ expect }) => {
    const timeline = setKey(createTimeline(), 'a', 'style.opacity', { t: 0, value: 1 });
    const next = apply(
      { scene: base, timeline },
      { kind: 'update', id: 'a', values: { style: { hue: 'red', opacity: 0.5 } } },
      1,
    );
    expect(next.timeline?.tracks['a:style.opacity'].keys).toEqual([
      { t: 0, value: 1 },
      { t: 1, value: 0.5 },
    ]);
    expect(next.scene.nodes.a.style).toEqual({ hue: 'red' });
    // An untouched opacity is the sampled value and stays off the base.
    const again = apply(next, { kind: 'update', id: 'a', values: { style: { hue: 'blue', opacity: 0.75 } } }, 0.5);
    expect(again.scene.nodes.a.style).toEqual({ hue: 'blue' });
  });

  test('a resize keys the centre and the size', ({ expect }) => {
    const next = apply(
      { scene: base },
      { kind: 'resize', id: 'a', bounds: { x: 0, y: 0, width: 200, height: 100 } },
      1,
    );
    expect(next.timeline?.tracks['a:size'].keys).toEqual([{ t: 1, value: { width: 200, height: 100 } }]);
    expect(next.timeline?.tracks['a:center'].keys).toEqual([{ t: 1, value: { x: 100, y: 50 } }]);
  });

  test('with auto-key off, edits away from t = 0 change base values', ({ expect }) => {
    const next = apply({ scene: base }, { kind: 'move', ids: ['a'], delta: { x: 10, y: 0 } }, 2, false);
    expect(next.timeline).toBeUndefined();
    expect(next.scene.nodes.a.center).toEqual({ x: 60, y: 25 });
  });
});

describe('animate', () => {
  test('the projection draws the scene at the clock time and hands the host the keys an edit makes', ({ expect }) => {
    const registry = Registry.make();
    const store = createMemoryStore([base]);
    const clock = createClock();
    const timeline = Atom.make<Timeline | undefined>(undefined);
    const projection = animate(createFreehandProjection({ registry, store, sceneId: 's' }), {
      registry,
      clock,
      timeline,
      onTimelineChange: (next) => registry.set(timeline, next),
    });
    registry.set(clock.time, 1);
    projection.apply({ kind: 'move', ids: ['a'], delta: { x: 100, y: 0 } });
    expect(registry.get(timeline)?.tracks['a:center'].keys).toHaveLength(1);
    expect(registry.get(projection.scene).nodes.a.center).toEqual({ x: 150, y: 25 });
    registry.set(clock.time, 0);
    // One key: before it the track holds it, so the node is drawn there at t = 0 too.
    expect(registry.get(projection.scene).nodes.a.center).toEqual({ x: 150, y: 25 });
    expect(registry.get(store.views).s.nodes.a.center).toEqual({ x: 50, y: 25 });
  });

  test('a host that takes no keys gets plain edits at any time', ({ expect }) => {
    const registry = Registry.make();
    const store = createMemoryStore([base]);
    const clock = createClock();
    const timeline = Atom.make<Timeline | undefined>(
      setKey(createTimeline(), 'a', 'size', { t: 0, value: { width: 1, height: 1 } }),
    );
    const projection = animate(createFreehandProjection({ registry, store, sceneId: 's' }), {
      registry,
      clock,
      timeline,
    });
    registry.set(clock.time, 1);
    projection.apply({ kind: 'move', ids: ['a'], delta: { x: 100, y: 0 } });
    expect(registry.get(store.views).s.nodes.a.center).toEqual({ x: 150, y: 25 });
    // The host's timeline still animates what it keys.
    expect(registry.get(projection.scene).nodes.a.size).toEqual({ width: 1, height: 1 });
  });
});
