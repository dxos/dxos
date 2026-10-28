//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ScriptError, createTimeline, setKey } from '@dxos/animation';
import { Ref } from '@dxos/echo';

import { Animation } from '#types';

import { dotsStage, makeDots } from '../testing/index.ts';
import { keyEdit } from './key.ts';
import { captionAt, compileShot, sampleTimeline, stageContext } from './sample.ts';

const dots = makeDots([
  { id: 'a', label: 'A', x: 0, y: 0, color: '#ff0000' },
  { id: 'b', label: 'B', x: 10, y: 0, color: '#0000ff' },
]);
const context = stageContext(dotsStage, dots);

const shot = (patch: Partial<Animation.Shot> = {}): Animation.Shot => ({
  ...Animation.makeShot(Ref.make(dots), 4),
  ...patch,
});

describe('sampleTimeline', () => {
  test('every track is read at the time, by target and property', ({ expect }) => {
    let timeline = createTimeline(4);
    timeline = setKey(timeline, 'a', 'position', { t: 0, value: { x: 0, y: 0 } }, 'point');
    timeline = setKey(timeline, 'a', 'position', { t: 2, value: { x: 20, y: 10 } }, 'point');
    timeline = setKey(timeline, 'b', 'opacity', { t: 0, value: 1 });
    timeline = setKey(timeline, 'b', 'opacity', { t: 4, value: 0 });
    const sample = sampleTimeline(timeline, 1);
    expect(sample.t).toBe(1);
    expect(sample.values.a.position).toEqual({ x: 10, y: 5 });
    expect(sample.values.b.opacity).toBeCloseTo(0.75);
    expect(sample.camera).toBeUndefined();
  });

  test('camera tracks and the shot camera track sample into the camera; its own tracks win', ({ expect }) => {
    let timeline = createTimeline(4);
    timeline = setKey(timeline, 'camera', 'zoom', { t: 0, value: 1 });
    timeline = setKey(timeline, 'camera', 'zoom', { t: 2, value: 3 });
    const cameraTrack = { target: 'camera', property: 'view', keys: [{ t: 0, value: { x: 5, zoom: 9 } }] };
    const sample = sampleTimeline(timeline, 1, cameraTrack);
    expect(sample.camera).toEqual({ x: 5, zoom: 2 });
    expect(sample.values.camera).toBeUndefined();
  });
});

describe('compileShot', () => {
  test('a shot without a script is its hand keys', ({ expect }) => {
    const hand = setKey(createTimeline(4), 'a', 'scale', { t: 1, value: 2 });
    expect(compileShot(shot({ timeline: hand }), context).timeline).toBe(hand);
  });

  test('a script compiles against the stage: show, a stage layout, and a caption', ({ expect }) => {
    const compiled = compileShot(
      shot({
        script: [
          { duration: 1, show: ['b'], caption: 'Enter B' },
          { duration: 1, layout: { kind: 'ring', targets: ['a', 'b'], params: { radius: 20 } } },
        ],
      }),
      context,
    );
    expect(sampleTimeline(compiled.timeline, 0).values.b).toMatchObject({ scale: 0, opacity: 0 });
    expect(sampleTimeline(compiled.timeline, 1).values.b).toMatchObject({ scale: 1, opacity: 1 });
    expect(sampleTimeline(compiled.timeline, 2).values.a.position).toEqual({ x: 0, y: -20 });
    expect(sampleTimeline(compiled.timeline, 2).values.b.position).toEqual({ x: 0, y: 20 });
    expect(captionAt(compiled.captions, 0.5)).toBe('Enter B');
  });

  test('the same script compiles to the same keys', ({ expect }) => {
    const script: Animation.Beat[] = [{ duration: 2, set: { a: { color: '#00ff00' } } }];
    expect(compileShot(shot({ script }), context)).toEqual(compileShot(shot({ script }), context));
  });

  test('a hand key wins over a compiled key at the same time', ({ expect }) => {
    const hand = setKey(createTimeline(4), 'b', 'opacity', { t: 1, value: 0.25 });
    const compiled = compileShot(shot({ timeline: hand, script: [{ duration: 1, show: ['b'] }] }), context);
    expect(sampleTimeline(compiled.timeline, 1).values.b.opacity).toBe(0.25);
    expect(sampleTimeline(compiled.timeline, 0).values.b.opacity).toBe(0);
  });

  test('a script naming an unknown target fails with the beat', ({ expect }) => {
    const bad = shot({ script: [{ duration: 1 }, { duration: 1, show: ['missing'] }] });
    expect(() => compileShot(bad, context)).toThrow(ScriptError);
    try {
      compileShot(bad, context);
    } catch (error) {
      expect(error instanceof ScriptError && error.beat).toBe(1);
    }
  });
});

describe('keyEdit', () => {
  test('an edit keys the animatable properties it changed and ignores the rest', ({ expect }) => {
    const timeline = keyEdit(
      createTimeline(4),
      { target: 'a', values: { position: { x: 3, y: 4 }, label: 'ignored' } },
      2,
      context.targets,
    );
    expect(Object.keys(timeline.tracks)).toEqual(['a:position']);
    expect(timeline.tracks['a:position']).toMatchObject({ kind: 'point', keys: [{ t: 2, value: { x: 3, y: 4 } }] });
  });
});
