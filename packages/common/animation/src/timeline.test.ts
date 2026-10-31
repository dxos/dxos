//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { JsonSchema } from '@dxos/echo';

import {
  animatableProperties,
  clampTime,
  createTimeline,
  ease,
  keyTimes,
  mergeTimelines,
  moveKeys,
  removeKey,
  setKey,
  trackId,
  trackValue,
} from './timeline.ts';
import { AnimatableAnnotation, type Easing, Vec3 } from './types.ts';

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
    const back: Easing = { bezier: [0.34, 1.56, 0.64, 1] };
    const peak = Math.max(...Array.from({ length: 50 }, (_, index) => ease(back, index / 50)));
    expect(peak).toBeGreaterThan(1);
  });
});

describe('keys', () => {
  test('a key at an existing time replaces it; removing the last key removes the track', ({ expect }) => {
    let timeline = setKey(createTimeline(), 'a', 'x', { t: 1, value: 0 });
    timeline = setKey(timeline, 'a', 'x', { t: 1, value: 5 });
    expect(timeline.tracks[trackId('a', 'x')].keys).toEqual([{ t: 1, value: 5 }]);
    expect(removeKey(timeline, 'a', 'x', 1).tracks).toEqual({});
  });

  test('a kind is recorded on the track, and the track value interpolates by it', ({ expect }) => {
    let timeline = setKey(createTimeline(), 'a', 'color', { t: 0, value: '#000000' }, 'color');
    timeline = setKey(timeline, 'a', 'color', { t: 1, value: '#ffffff' });
    const track = timeline.tracks[trackId('a', 'color')];
    expect(track.kind).toBe('color');
    expect(trackValue(track, 0.5)).not.toBe('#000000');
  });

  test('moving keys and listing key times', ({ expect }) => {
    let timeline = setKey(createTimeline(), 'a', 'x', { t: 0, value: 0 });
    timeline = setKey(timeline, 'a', 'x', { t: 1, value: 1, easing: 'ease-in' });
    timeline = setKey(timeline, 'b', 'x', { t: 2, value: 1 });
    const moved = moveKeys(timeline, new Set(['a']), 1, 3);
    expect(moved.tracks[trackId('a', 'x')].keys[1]).toEqual({ t: 3, value: 1, easing: 'ease-in' });
    expect(keyTimes(moved, ['a', 'b'])).toEqual([0, 2, 3]);
  });

  test('time wraps on a looping timeline and clamps otherwise', ({ expect }) => {
    expect(clampTime({ duration: 2, tracks: {} }, 3)).toBe(2);
    expect(clampTime({ duration: 2, loop: true, tracks: {} }, 3)).toBe(1);
  });
});

describe('mergeTimelines', () => {
  test('hand keys win at the same track and time; other keys and tracks of both are kept', ({ expect }) => {
    let compiled = setKey(createTimeline(4), 'a', 'x', { t: 0, value: 0 });
    compiled = setKey(compiled, 'a', 'x', { t: 1, value: 10 });
    compiled = setKey(compiled, 'b', 'x', { t: 1, value: 1 });
    let hand = setKey(createTimeline(6), 'a', 'x', { t: 1, value: 99 });
    hand = setKey(hand, 'c', 'x', { t: 2, value: 2 });
    const merged = mergeTimelines(hand, compiled);
    expect(merged.duration).toBe(6);
    expect(merged.tracks[trackId('a', 'x')].keys).toEqual([
      { t: 0, value: 0 },
      { t: 1, value: 99 },
    ]);
    expect(Object.keys(merged.tracks).sort()).toEqual([trackId('a', 'x'), trackId('b', 'x'), trackId('c', 'x')]);
  });
});

describe('animatable properties', () => {
  const Model = Schema.Struct({
    position: Vec3.pipe(AnimatableAnnotation.set('vec3')),
    rotation: Schema.optional(Vec3.pipe(AnimatableAnnotation.set('rotation'))),
    color: Schema.String.pipe(AnimatableAnnotation.set('color')),
    label: Schema.String,
    style: Schema.Struct({ opacity: Schema.Number.pipe(AnimatableAnnotation.set('number')) }),
  });

  test('read from the annotation, through optional fields and nested structs', ({ expect }) => {
    expect(animatableProperties(Model)).toEqual({
      'position': 'vec3',
      'rotation': 'rotation',
      'color': 'color',
      'style.opacity': 'number',
    });
  });

  test('the marker survives a round trip through JSON schema, as a stored schema makes', ({ expect }) => {
    const restored = JsonSchema.toEffectSchema(JsonSchema.toJsonSchema(Model));
    expect(animatableProperties(restored)).toEqual(animatableProperties(Model));
  });
});
