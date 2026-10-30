//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type Timeline,
  animatableProperties,
  createTimeline,
  keyTimes,
  moveKeys,
  removeKey,
  setKey,
  trackValue,
} from '@dxos/animation';
import { InstanceNode, RectNode } from '@dxos/scene';

import { ViewBuilder } from '../builder/index.ts';
import { reduceIntent } from '../engine/index.ts';
import { BASE_ANIMATABLE, applyCameraKey, cameraKey, sampleCamera, sampleView } from './timeline.ts';
import { CAMERA_TARGET } from './types.ts';

const {
  views: [base],
} = ViewBuilder.view('s', [
  ViewBuilder.rect('a', { x: 0, y: 0, width: 100, height: 50 }),
  ViewBuilder.rect('b', { x: 200, y: 0, width: 100, height: 50 }),
]).build();

/** `a` moves from x 50 to 150 over two seconds, easing out, and fades in over the first second. */
const animated = (): Timeline => {
  let timeline = createTimeline(4);
  timeline = setKey(timeline, 'a', 'center', { t: 0, value: { x: 50, y: 25 } });
  timeline = setKey(timeline, 'a', 'center', { t: 2, value: { x: 150, y: 25 }, easing: 'ease-out' });
  timeline = setKey(timeline, 'a', 'style.opacity', { t: 0, value: 0 });
  timeline = setKey(timeline, 'a', 'style.opacity', { t: 1, value: 1 });
  return timeline;
};

describe('sampleView', () => {
  test('a scene without a timeline is returned as it is', ({ expect }) => {
    expect(sampleView(base, undefined, 1)).toBe(base);
  });

  test('tracked properties take their eased value; others keep the base value', ({ expect }) => {
    const timeline = animated();
    const at = (t: number) => sampleView(base, timeline, t).nodes.a;
    expect(at(0).center).toEqual({ x: 50, y: 25 });
    expect(at(2).center).toEqual({ x: 150, y: 25 });
    // Ease-out covers more than half the distance by half the time.
    expect(at(1).center.x).toBeCloseTo(50 + 100 * (1 - 0.5 ** 3));
    expect(at(0.5).style?.opacity).toBeCloseTo(0.5);
    // Past the last key a track holds its end value.
    expect(at(3.5).center).toEqual({ x: 150, y: 25 });
    expect(sampleView(base, timeline, 1).nodes.b).toBe(base.nodes.b);
    expect(at(1).id).toBe('a');
  });

  test('the same time samples once', ({ expect }) => {
    const timeline = animated();
    expect(sampleView(base, timeline, 1.25)).toBe(sampleView(base, timeline, 1.25));
    // Another timeline at the same time samples anew.
    expect(sampleView(base, animated(), 1.25)).not.toBe(sampleView(base, timeline, 1.25));
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

  test('moving keys moves the selection keys at one time, keeping value and easing, and replaces a key there', ({
    expect,
  }) => {
    let timeline = setKey(createTimeline(4), 'a', 'size', { t: 1, value: 'big', easing: 'ease-in' });
    timeline = setKey(timeline, 'a', 'style.opacity', { t: 1, value: 0.5 });
    timeline = setKey(timeline, 'a', 'style.opacity', { t: 2, value: 1 });
    timeline = setKey(timeline, 'b', 'size', { t: 1, value: 'small' });
    const moved = moveKeys(timeline, new Set(['a']), 1, 2);
    expect(moved.tracks['a:size'].keys).toEqual([{ t: 2, value: 'big', easing: 'ease-in' }]);
    // The key already at 2 is replaced by the one moved onto it.
    expect(moved.tracks['a:style.opacity'].keys).toEqual([{ t: 2, value: 0.5 }]);
    // Another node's keys stay.
    expect(moved.tracks['b:size'].keys).toEqual([{ t: 1, value: 'small' }]);
    expect(moveKeys(timeline, new Set(['a']), 3, 2)).toBe(timeline);
  });

  test('key times of the selection are sorted without repeats', ({ expect }) => {
    expect(keyTimes(animated(), ['a'])).toEqual([0, 1, 2]);
    expect(keyTimes(animated(), ['b'])).toEqual([]);
  });

  test('the tracks of a deleted node key nothing', ({ expect }) => {
    const next = reduceIntent(base, { kind: 'delete', ids: ['a'] });
    expect(sampleView(next, animated(), 1)).toBe(next);
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
