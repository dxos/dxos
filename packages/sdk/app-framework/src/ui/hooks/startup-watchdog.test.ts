//
// Copyright 2025 DXOS.org
//

import { afterEach, assert, beforeEach, describe, it, vi } from '@effect/vitest';

import { createStartupWatchdog } from './startup-watchdog';

describe('createStartupWatchdog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const setup = (timeout = 5_000) => {
    const stalls: number[] = [];
    const watchdog = createStartupWatchdog({ timeout, onStall: ({ executedMs }) => stalls.push(executedMs) });
    return { stalls, watchdog };
  };

  it('fires once after `timeout` of executed time without progress', () => {
    const { stalls } = setup();
    vi.advanceTimersByTime(4_000);
    assert.deepEqual(stalls, []);
    vi.advanceTimersByTime(10_000);
    assert.deepEqual(stalls, [5_000]);
  });

  it('progress restarts the stall window', () => {
    const { stalls, watchdog } = setup();
    vi.advanceTimersByTime(4_000);
    watchdog.progress();
    vi.advanceTimersByTime(4_000);
    assert.deepEqual(stalls, []);
    vi.advanceTimersByTime(1_000);
    assert.deepEqual(stalls, [9_000]);
  });

  it('does not count time the process did not run', () => {
    const { stalls } = setup();
    vi.advanceTimersByTime(2_000);
    // One tick observes an hour on the clock: the process was suspended, not stalled.
    const clock = performance.now.bind(performance);
    vi.spyOn(performance, 'now').mockImplementation(() => clock() + 60 * 60_000);
    vi.advanceTimersByTime(1_000);
    assert.deepEqual(stalls, []);
    vi.advanceTimersByTime(1_000);
    assert.deepEqual(stalls, [5_000]);
  });

  it('never fires after dispose', () => {
    const { stalls, watchdog } = setup();
    vi.advanceTimersByTime(4_000);
    watchdog.dispose();
    vi.advanceTimersByTime(60_000);
    assert.deepEqual(stalls, []);
  });
});
