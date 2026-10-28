//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Ref } from '@dxos/echo';

import { Animation } from '#types';

import { makeDots } from '../testing/index.ts';
import { animationDuration, locateShot, shotSpans } from './sequence.ts';

const stage = Ref.make(makeDots([]));

const shot = (duration: number, transition?: Animation.Transition): Animation.Shot => ({
  ...Animation.makeShot(stage, duration),
  ...(transition ? { transition } : {}),
});

describe('sequence', () => {
  test('shots play end to end', ({ expect }) => {
    const shots = [shot(2), shot(3), shot(1)];
    expect(animationDuration(shots)).toBe(6);
    expect(shotSpans(shots).map(({ start, end }) => [start, end])).toEqual([
      [0, 2],
      [2, 5],
      [5, 6],
    ]);
  });

  test('a time is a shot and a time in it; a boundary starts the later shot', ({ expect }) => {
    const shots = [shot(2), shot(3)];
    expect(locateShot(shots, 1)).toMatchObject({ index: 0, local: 1 });
    expect(locateShot(shots, 2)).toMatchObject({ index: 1, local: 0 });
    expect(locateShot(shots, 4.5)).toMatchObject({ index: 1, local: 2.5 });
  });

  test('before the start is the start; at or past the end is the end of the last shot', ({ expect }) => {
    const shots = [shot(2), shot(3)];
    expect(locateShot(shots, -1)).toMatchObject({ index: 0, local: 0 });
    expect(locateShot(shots, 5)).toMatchObject({ index: 1, local: 3 });
    expect(locateShot(shots, 9)).toMatchObject({ index: 1, local: 3 });
  });

  test('a shot with no length is skipped; no shots locate nothing', ({ expect }) => {
    expect(locateShot([shot(2), shot(0), shot(1)], 2)).toMatchObject({ index: 2, local: 0 });
    expect(locateShot([], 0)).toBeUndefined();
  });

  test('a fade brings its shot in over its duration; a cut shows at once', ({ expect }) => {
    const shots = [shot(2), shot(2, { kind: 'fade', duration: 1 }), shot(2, { kind: 'cut', duration: 1 })];
    expect(locateShot(shots, 1)?.opacity).toBe(1);
    expect(locateShot(shots, 2)?.opacity).toBe(0);
    expect(locateShot(shots, 2.5)?.opacity).toBeCloseTo(0.5);
    expect(locateShot(shots, 3.5)?.opacity).toBe(1);
    expect(locateShot(shots, 4)?.opacity).toBe(1);
  });
});
