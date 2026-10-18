//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SceneBuilder } from '../utils/builder.ts';
import { reduceIntent } from './projection.ts';
import {
  BASE_ANIMATABLE,
  animatableProperties,
  applyCameraKey,
  cameraKey,
  createTimeline,
  ease,
  keyTimes,
  removeKey,
  sampleCamera,
  sampleScene,
  setKey,
  trackValue,
} from './timeline.ts';
import { CAMERA_TARGET, InstanceNode, RectNode, type Scene } from './types.ts';

const {
  scenes: [base],
} = SceneBuilder.scene('s', [
  SceneBuilder.rect('a', { x: 0, y: 0, width: 100, height: 50 }),
  SceneBuilder.rect('b', { x: 200, y: 0, width: 100, height: 50 }),
]).build();

/** `a` moves from x 50 to 150 over two seconds, easing out, and fades in over the first second. */
const animated = (): Scene => {
  let timeline = createTimeline(4);
  timeline = setKey(timeline, 'a', 'center', { t: 0, value: { x: 50, y: 25 } });
  timeline = setKey(timeline, 'a', 'center', { t: 2, value: { x: 150, y: 25 }, easing: 'ease-out' });
  timeline = setKey(timeline, 'a', 'style.opacity', { t: 0, value: 0 });
  timeline = setKey(timeline, 'a', 'style.opacity', { t: 1, value: 1 });
  return { ...base, timeline };
};

describe('easing', () => {
  test('named curves start at 0, end at 1, and bend as named', ({ expect }) => {
    for (const easing of ['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const) {
      expect(ease(easing, 0)).toBe(0);
      expect(ease(easing, 1)).toBe(1);
    }
    expect(ease('ease-in', 0.5)).toBeLessThan(0.5);
    expect(ease('ease-out', 0.5)).toBeGreaterThan(0.5);
    expect(ease('step', 0.99)).toBe(0);
  });

  test('a bezier matches CSS: ease is (0.25, 0.1, 0.25, 1), and a y past 1 overshoots', ({ expect }) => {
    expect(ease({ bezier: [0.25, 0.1, 0.25, 1] }, 0.5)).toBeCloseTo(0.8024, 3);
    const back = { bezier: [0.34, 1.56, 0.64, 1] as [number, number, number, number] };
    const peak = Math.max(...Array.from({ length: 50 }, (_, index) => ease(back, index / 50)));
    expect(peak).toBeGreaterThan(1);
  });
});

describe('sampleScene', () => {
  test('a scene without a timeline is returned as it is', ({ expect }) => {
    expect(sampleScene(base, 1)).toBe(base);
  });

  test('tracked properties take their eased value; others keep the base value', ({ expect }) => {
    const scene = animated();
    const at = (t: number) => sampleScene(scene, t).nodes.a;
    expect(at(0).center).toEqual({ x: 50, y: 25 });
    expect(at(2).center).toEqual({ x: 150, y: 25 });
    // Ease-out covers more than half the distance by half the time.
    expect(at(1).center.x).toBeCloseTo(50 + 100 * (1 - 0.5 ** 3));
    expect(at(0.5).style?.opacity).toBeCloseTo(0.5);
    // Past the last key a track holds its end value.
    expect(at(3.5).center).toEqual({ x: 150, y: 25 });
    expect(sampleScene(scene, 1).nodes.b).toBe(scene.nodes.b);
    expect(at(1).id).toBe('a');
  });

  test('the same time samples once', ({ expect }) => {
    const scene = animated();
    expect(sampleScene(scene, 1.25)).toBe(sampleScene(scene, 1.25));
  });

  test('a discrete value holds until the next key', ({ expect }) => {
    const timeline = setKey(setKey(createTimeline(), 'a', 'label', { t: 0, value: 'one' }), 'a', 'label', {
      t: 1,
      value: 'two',
    });
    const track = timeline.tracks['a:label'];
    expect(trackValue(track, 0.99)).toBe('one');
    expect(trackValue(track, 1)).toBe('two');
  });
});

describe('keys', () => {
  test('a key at an existing time replaces it; removing the last key removes the track', ({ expect }) => {
    let timeline = setKey(createTimeline(), 'a', 'style.opacity', { t: 1, value: 0 });
    timeline = setKey(timeline, 'a', 'style.opacity', { t: 1, value: 0.5 });
    expect(timeline.tracks['a:style.opacity'].keys).toEqual([{ t: 1, value: 0.5 }]);
    expect(removeKey(timeline, 'a', 'style.opacity', 1).tracks).toEqual({});
  });

  test('key times of the selection are sorted without repeats', ({ expect }) => {
    expect(keyTimes(animated().timeline, ['a'])).toEqual([0, 1, 2]);
    expect(keyTimes(animated().timeline, ['b'])).toEqual([]);
  });

  test('deleting a node deletes its tracks', ({ expect }) => {
    const next = reduceIntent(animated(), { kind: 'delete', ids: ['a'] });
    expect(next.timeline?.tracks).toEqual({});
  });
});

describe('animatable properties', () => {
  test('read from the schema annotations of the shared fields', ({ expect }) => {
    expect(animatableProperties(RectNode)).toEqual(BASE_ANIMATABLE);
    expect(animatableProperties(InstanceNode)).toEqual(BASE_ANIMATABLE);
  });

  test('a struct property is searched for animatable fields, reported by dot path', ({ expect }) => {
    expect(animatableProperties(RectNode)['style.opacity']).toBe('number');
    expect(animatableProperties(RectNode).style).toBeUndefined();
  });
});

describe('camera', () => {
  test('keys hold the view centre, so a keyed camera frames the same point in any viewport', ({ expect }) => {
    const camera = { x: -100, y: -50, zoom: 2 };
    const key = cameraKey(camera, 800, 600);
    expect(key).toEqual({ x: 300, y: 200, zoom: 2 });
    expect(applyCameraKey({ x: 0, y: 0, zoom: 1 }, key, 800, 600)).toEqual(camera);
    const timeline = setKey(createTimeline(), CAMERA_TARGET, 'zoom', { t: 0, value: 1 });
    expect(sampleCamera(setKey(timeline, CAMERA_TARGET, 'zoom', { t: 2, value: 3 }), 1)).toEqual({ zoom: 2 });
  });
});
