//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Arranger, type Beat, ScriptError, beatTimes, compileScript } from './script.ts';
import { mergeTimelines, setKey, trackId, trackValue } from './timeline.ts';
import { type Timeline } from './types.ts';

const targets = {
  a: { position: { x: 0, y: 0, z: 0 }, scale: 1 },
  b: { position: { x: 10, y: 0, z: 0 }, scale: 1 },
  c: { position: { x: 20, y: 0, z: 0 }, scale: { x: 2, y: 2, z: 2 } },
};

/** Places targets along the x axis, `spacing` apart. */
const row: Arranger = ({ targets, params }) =>
  Object.fromEntries(targets.map((target, index) => [target, { x: index * Number(params.spacing ?? 1), y: 0, z: 0 }]));

const value = (timeline: Timeline, target: string, property: string, t: number) => {
  const track = timeline.tracks[trackId(target, property)];
  return track ? trackValue(track, t) : undefined;
};

describe('compileScript', () => {
  test('show rises from 0, hide falls to 0, and beats follow one another by default', ({ expect }) => {
    const script: Beat[] = [
      { duration: 1, show: ['a'] },
      { duration: 2, hide: ['a'], ease: 'ease-in' },
    ];
    const { timeline } = compileScript(script, { targets, duration: 4 });
    expect(value(timeline, 'a', 'scale', 0)).toBe(0);
    expect(value(timeline, 'a', 'opacity', 0)).toBe(0);
    expect(value(timeline, 'a', 'scale', 1)).toBe(1);
    expect(value(timeline, 'a', 'opacity', 0.5)).toBeCloseTo(0.5);
    expect(value(timeline, 'a', 'scale', 3)).toBe(0);
    expect(timeline.tracks[trackId('a', 'scale')].keys.at(-1)?.easing).toBe('ease-in');
  });

  test('a target first shown later is hidden until its beat; a vec3 scale shrinks to zero per axis', ({ expect }) => {
    const { timeline } = compileScript([{ at: 2, duration: 1, show: ['c'] }], { targets, duration: 4 });
    expect(value(timeline, 'c', 'scale', 0)).toEqual({ x: 0, y: 0, z: 0 });
    expect(value(timeline, 'c', 'scale', 3)).toEqual({ x: 2, y: 2, z: 2 });
  });

  test('set keys the value held at the start and the new value at the end', ({ expect }) => {
    const { timeline } = compileScript([{ at: 1, duration: 2, set: { b: { position: { x: 30, y: 0, z: 0 } } } }], {
      targets,
      duration: 4,
    });
    expect(value(timeline, 'b', 'position', 0)).toEqual({ x: 10, y: 0, z: 0 });
    expect(value(timeline, 'b', 'position', 2)).toEqual({ x: 20, y: 0, z: 0 });
    expect(value(timeline, 'b', 'position', 3)).toEqual({ x: 30, y: 0, z: 0 });
  });

  test('a layout takes its positions from the stage arranger', ({ expect }) => {
    const { timeline } = compileScript(
      [{ duration: 1, layout: { kind: 'row', targets: ['b', 'a'], params: { spacing: 5 } } }],
      {
        targets,
        layouts: { row },
        duration: 2,
      },
    );
    expect(value(timeline, 'b', 'position', 1)).toEqual({ x: 0, y: 0, z: 0 });
    expect(value(timeline, 'a', 'position', 1)).toEqual({ x: 5, y: 0, z: 0 });
  });

  test('merge moves the sources onto the destination and shrinks them while it grows', ({ expect }) => {
    const { timeline } = compileScript([{ duration: 1, merge: { from: ['a'], into: 'b' } }], { targets, duration: 2 });
    expect(value(timeline, 'a', 'position', 1)).toEqual({ x: 10, y: 0, z: 0 });
    expect(value(timeline, 'a', 'scale', 1)).toBe(0);
    expect(value(timeline, 'a', 'opacity', 1)).toBe(0);
    expect(value(timeline, 'b', 'scale', 0)).toBe(1);
    expect(value(timeline, 'b', 'scale', 1)).toBeCloseTo(Math.SQRT2);
  });

  test('camera keys go on the camera target, from its starting values', ({ expect }) => {
    const { timeline } = compileScript([{ at: 1, duration: 1, camera: { zoom: 2 } }], {
      targets,
      duration: 2,
      camera: { zoom: 1 },
    });
    expect(value(timeline, 'camera', 'zoom', 0)).toBe(1);
    expect(value(timeline, 'camera', 'zoom', 2)).toBe(2);
  });

  test('kinds are recorded on the tracks the script creates', ({ expect }) => {
    const { timeline } = compileScript([{ duration: 1, set: { a: { color: '#0000ff' } } }], {
      targets: { a: { color: '#ff0000' } },
      kinds: { color: 'color' },
      duration: 1,
    });
    expect(timeline.tracks[trackId('a', 'color')].kind).toBe('color');
  });

  test('effects and captions come back as spans', ({ expect }) => {
    const { effects, captions } = compileScript(
      [
        { duration: 1, effects: { add: [{ id: 'flow' }] }, caption: 'One' },
        { duration: 1, caption: 'Two' },
        { duration: 1, effects: { remove: ['flow'] }, caption: '' },
      ],
      { targets, duration: 5 },
    );
    expect(effects).toEqual([{ effect: { id: 'flow' }, start: 0, end: 2 }]);
    expect(captions).toEqual([
      { text: 'One', start: 0, end: 1 },
      { text: 'Two', start: 1, end: 2 },
    ]);
  });

  test('the same script compiles to the same keys', ({ expect }) => {
    const script: Beat[] = [
      { duration: 1, show: ['a', 'b'] },
      { duration: 1, layout: { kind: 'row', targets: ['a', 'b'] } },
      { duration: 1, merge: { from: ['a'], into: 'b' } },
    ];
    const options = { targets, layouts: { row }, duration: 3 };
    expect(JSON.stringify(compileScript(script, options))).toBe(JSON.stringify(compileScript(script, options)));
  });

  test('unknown targets, layouts and effects fail naming the beat', ({ expect }) => {
    const compile = (script: Beat[]) => () => compileScript(script, { targets, layouts: { row }, duration: 3 });
    expect(compile([{ duration: 1 }, { duration: 1, show: ['zz'] }])).toThrow(/Beat 1: unknown target 'zz'/);
    expect(compile([{ duration: 1, layout: { kind: 'ring', targets: ['a'] } }])).toThrow(
      /Beat 0: unknown layout 'ring'/,
    );
    expect(compile([{ duration: 1, effects: { remove: ['flow'] } }])).toThrow(ScriptError);
  });

  test('hand keys win over compiled keys at the same time', ({ expect }) => {
    const { timeline } = compileScript([{ duration: 1, set: { a: { scale: 3 } } }], { targets, duration: 2 });
    const hand = setKey({ ...timeline, tracks: {} }, 'a', 'scale', { t: 1, value: 5 });
    const merged = mergeTimelines(hand, timeline);
    expect(value(merged, 'a', 'scale', 0)).toBe(1);
    expect(value(merged, 'a', 'scale', 1)).toBe(5);
  });
});

describe('beatTimes', () => {
  test('a beat starts at its `at`, else where the previous one ended', ({ expect }) => {
    expect(beatTimes([{ duration: 1 }, { duration: 2 }, { at: 0.5, duration: 1 }, { duration: 1 }])).toEqual([
      { start: 0, end: 1 },
      { start: 1, end: 3 },
      { start: 0.5, end: 1.5 },
      { start: 1.5, end: 2.5 },
    ]);
  });
});
