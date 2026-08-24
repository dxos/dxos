//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { EventLoopLagTracker } from './event-loop-lag';

describe('EventLoopLagTracker', () => {
  test('an on-schedule loop reports no lag', () => {
    const tracker = new EventLoopLagTracker(500);
    tracker.sample(0);
    tracker.sample(500);
    tracker.sample(1_000);

    expect(tracker.takeMaxMs()).toEqual(0);
  });

  test('the first sample cannot produce lag', () => {
    const tracker = new EventLoopLagTracker(500);
    // There is no previous timestamp to compare against, so a late first probe is not a stall.
    tracker.sample(10_000);

    expect(tracker.takeMaxMs()).toEqual(0);
  });

  test('reports how far beyond the interval a probe fired', () => {
    const tracker = new EventLoopLagTracker(500);
    tracker.sample(0);
    tracker.sample(2_300);

    expect(tracker.takeMaxMs()).toEqual(1_800);
  });

  test('keeps the peak across a window, not the latest', () => {
    const tracker = new EventLoopLagTracker(500);
    tracker.sample(0);
    tracker.sample(3_000); // 2500ms of lag
    tracker.sample(3_500); // on schedule again

    expect(tracker.takeMaxMs()).toEqual(2_500);
  });

  test('takeMaxMs resets so each export window is independent', () => {
    const tracker = new EventLoopLagTracker(500);
    tracker.sample(0);
    tracker.sample(2_000);
    expect(tracker.takeMaxMs()).toEqual(1_500);

    // A quiet window after a busy one must not keep reporting the old peak.
    expect(tracker.takeMaxMs()).toEqual(0);
    tracker.sample(2_500);
    expect(tracker.takeMaxMs()).toEqual(0);
  });

  test('a probe firing early is not negative lag', () => {
    const tracker = new EventLoopLagTracker(500);
    tracker.sample(0);
    tracker.sample(400);

    expect(tracker.takeMaxMs()).toEqual(0);
  });
});
