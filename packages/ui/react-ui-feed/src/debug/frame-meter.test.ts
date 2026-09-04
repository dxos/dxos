//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { rateAtQuantile } from './frame-meter';

/** A pass as a list of frame durations (ms), in the histogram the meter keeps. */
const histogram = (durations: number[]): { buckets: Uint32Array; frames: number } => {
  const buckets = new Uint32Array(512);
  for (const duration of durations) {
    buckets[Math.min(Math.round(duration), 511)]++;
  }
  return { buckets, frames: durations.length };
};

const rate = (durations: number[], quantile: number) => {
  const { buckets, frames } = histogram(durations);
  return rateAtQuantile(buckets, frames, quantile);
};

describe('rateAtQuantile', () => {
  test('reports the display rate for a pass that never missed a frame', () => {
    const smooth = Array.from({ length: 600 }, () => 16);
    expect(rate(smooth, 0.5)).toEqual(63);
    expect(rate(smooth, 0.95)).toEqual(63);
  });

  test('separates a single stall from the pass that contains it', () => {
    // The case the whole meter exists for: 60fps throughout, one 200ms stall. A mean would call
    // this smooth; the reader would not.
    const stalled = [...Array.from({ length: 599 }, () => 16), 200];
    expect(rate(stalled, 0.5)).toEqual(63);
    expect(rate(stalled, 0.95)).toEqual(63);
    expect(rate(stalled, 1)).toEqual(5);
  });

  test('the slow tail drags the 95th percentile down once a twentieth of the pass is bad', () => {
    const janky = [...Array.from({ length: 90 }, () => 16), ...Array.from({ length: 10 }, () => 50)];
    expect(rate(janky, 0.5)).toEqual(63);
    expect(rate(janky, 0.95)).toEqual(20);
  });

  test('an empty pass reports nothing rather than dividing by zero', () => {
    expect(rate([], 0.5)).toEqual(0);
    expect(rateAtQuantile(new Uint32Array(512), 0, 0.95)).toEqual(0);
  });
});
