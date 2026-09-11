//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { SyncEpisodeTracker } from './sync-episodes.ts';

describe('SyncEpisodeTracker', () => {
  test('records the duration of a completed episode', () => {
    const tracker = new SyncEpisodeTracker();

    expect(tracker.observe(0, 0)).toBeUndefined();
    expect(tracker.observe(1_000, 10)).toBeUndefined();
    expect(tracker.isOpen).toEqual(true);

    const closed = tracker.observe(6_000, 0);
    expect(closed).toEqual({ durationMs: 5_000, truncated: false });
    expect(tracker.isOpen).toEqual(false);
  });

  test('stays caught up while the backlog is empty', () => {
    const tracker = new SyncEpisodeTracker();

    expect(tracker.observe(0, 0)).toBeUndefined();
    expect(tracker.observe(1_000, 0)).toBeUndefined();
    expect(tracker.isOpen).toEqual(false);
    expect(tracker.stalledForMs(5_000)).toEqual(0);
  });

  test('a backlog present at the first observation opens a truncated episode', () => {
    const tracker = new SyncEpisodeTracker();

    // Provider startup, or a tab reloading mid-backlog: there is no 0 -> non-zero transition to
    // see, so without this the in-flight episode would be invisible to both instruments.
    expect(tracker.observe(1_000, 42)).toBeUndefined();
    expect(tracker.isOpen).toEqual(true);

    const closed = tracker.observe(4_000, 0);
    expect(closed).toEqual({ durationMs: 3_000, truncated: true });
  });

  test('an episode after a caught-up observation is not truncated', () => {
    const tracker = new SyncEpisodeTracker();

    tracker.observe(1_000, 5);
    expect(tracker.observe(2_000, 0)?.truncated).toEqual(true);

    tracker.observe(3_000, 5);
    expect(tracker.observe(4_000, 0)?.truncated).toEqual(false);
  });

  test('progress is a decrease, so a flat backlog keeps stalling', () => {
    const tracker = new SyncEpisodeTracker();
    tracker.observe(0, 0);
    tracker.observe(1_000, 10);

    // Re-reporting the same backlog is not progress; the client must not look healthy.
    tracker.observe(2_000, 10);
    tracker.observe(3_000, 10);
    expect(tracker.stalledForMs(3_000)).toEqual(2_000);

    tracker.observe(4_000, 9);
    expect(tracker.stalledForMs(4_000)).toEqual(0);
  });

  test('a rising backlog does not reset the stall clock', () => {
    const tracker = new SyncEpisodeTracker();
    tracker.observe(0, 0);
    tracker.observe(1_000, 10);

    // Local writes raising the count are not sync progress, so the low-water mark holds.
    tracker.observe(2_000, 25);
    expect(tracker.stalledForMs(2_000)).toEqual(1_000);

    tracker.observe(3_000, 12);
    expect(tracker.stalledForMs(3_000)).toEqual(2_000);

    tracker.observe(4_000, 8);
    expect(tracker.stalledForMs(4_000)).toEqual(0);
  });

  test('a permanently stuck client reports a growing stall and no duration', () => {
    const tracker = new SyncEpisodeTracker();
    tracker.observe(0, 0);
    tracker.observe(1_000, 7);

    for (let now = 2_000; now <= 900_000; now += 60_000) {
      expect(tracker.observe(now, 7)).toBeUndefined();
    }

    // The histogram never records, which is exactly why the gauge exists.
    expect(tracker.stalledForMs(900_000)).toEqual(899_000);
    expect(tracker.isOpen).toEqual(true);
  });

  test('the stall clock resets across episodes', () => {
    const tracker = new SyncEpisodeTracker();
    tracker.observe(0, 0);
    tracker.observe(1_000, 5);
    tracker.observe(2_000, 5);
    expect(tracker.stalledForMs(2_000)).toEqual(1_000);

    tracker.observe(3_000, 0);
    expect(tracker.stalledForMs(9_000)).toEqual(0);

    tracker.observe(10_000, 4);
    expect(tracker.stalledForMs(10_500)).toEqual(500);
  });

  test('treats a negative backlog as caught up', () => {
    const tracker = new SyncEpisodeTracker();
    tracker.observe(0, 5);
    expect(tracker.observe(1_000, -1)).toEqual({ durationMs: 1_000, truncated: true });
    expect(tracker.stalledForMs(2_000)).toEqual(0);
  });
});
