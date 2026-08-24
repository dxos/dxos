//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { EventLoopLagTracker } from './event-loop-lag';

/** Closes the window and returns its published peak. */
const rotated = (tracker: EventLoopLagTracker): number => {
  tracker.rotate();
  return tracker.peakMs;
};

describe('EventLoopLagTracker', () => {
  test('an on-schedule loop reports no lag', () => {
    const tracker = new EventLoopLagTracker(500);
    tracker.sample(0);
    tracker.sample(500);
    tracker.sample(1_000);

    expect(rotated(tracker)).toEqual(0);
  });

  test('the first sample cannot produce lag', () => {
    const tracker = new EventLoopLagTracker(500);
    // There is no previous timestamp to compare against, so a late first probe is not a stall.
    tracker.sample(10_000);

    expect(rotated(tracker)).toEqual(0);
  });

  test('reports how far beyond the interval a probe fired', () => {
    const tracker = new EventLoopLagTracker(500);
    tracker.sample(0);
    tracker.sample(2_300);

    expect(rotated(tracker)).toEqual(1_800);
  });

  test('keeps the peak across a window, not the latest', () => {
    const tracker = new EventLoopLagTracker(500);
    tracker.sample(0);
    tracker.sample(3_000); // 2500ms of lag
    tracker.sample(3_500); // on schedule again

    expect(rotated(tracker)).toEqual(2_500);
  });

  test('rotate publishes the window peak, and a quiet window clears it', () => {
    const tracker = new EventLoopLagTracker(500);
    tracker.sample(0);
    tracker.sample(2_000);

    tracker.rotate();
    expect(tracker.peakMs).toEqual(1_500);

    // A quiet window after a busy one must not keep reporting the old peak.
    tracker.sample(2_500);
    tracker.rotate();
    expect(tracker.peakMs).toEqual(0);
  });

  test('reading the peak is idempotent', () => {
    const tracker = new EventLoopLagTracker(500);
    tracker.sample(0);
    tracker.sample(2_000);
    tracker.rotate();

    // A destructive read would break the moment it ran twice per window — which a second
    // RemoteMetrics processor, or a flush() landing beside a periodic collection, would cause.
    expect(tracker.peakMs).toEqual(1_500);
    expect(tracker.peakMs).toEqual(1_500);
    expect(tracker.peakMs).toEqual(1_500);
  });

  test('nothing is reported until the window rotates', () => {
    const tracker = new EventLoopLagTracker(500);
    tracker.sample(0);
    tracker.sample(2_000);

    expect(tracker.peakMs).toEqual(0);
  });

  test('a probe firing early is not negative lag', () => {
    const tracker = new EventLoopLagTracker(500);
    tracker.sample(0);
    tracker.sample(400);

    expect(rotated(tracker)).toEqual(0);
  });
});
