//
// Copyright 2025 DXOS.org
//

import { afterEach, assert, beforeEach, describe, it, vi } from '@effect/vitest';

import { type StartupStall, createStartupWatchdog } from './startup-watchdog';

describe('createStartupWatchdog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = (timeout = 5_000) => {
    const stalls: StartupStall[] = [];
    const watchdog = createStartupWatchdog({
      timeout,
      onStall: (stall) => stalls.push(stall),
      now: () => Date.now(),
    });
    return { stalls, watchdog };
  };

  it('fires once after `timeout` of executed time without progress', () => {
    const { stalls } = setup();
    vi.advanceTimersByTime(4_000);
    assert.lengthOf(stalls, 0);
    vi.advanceTimersByTime(10_000);
    assert.lengthOf(stalls, 1);
    assert.equal(stalls[0].executedMs, 5_000);
    assert.equal(stalls[0].stalledForMs, 5_000);
  });

  it('progress restarts the stall window', () => {
    const { stalls, watchdog } = setup();
    vi.advanceTimersByTime(4_000);
    watchdog.progress();
    vi.advanceTimersByTime(4_000);
    assert.lengthOf(stalls, 0);
    vi.advanceTimersByTime(1_000);
    assert.lengthOf(stalls, 1);
    assert.equal(stalls[0].executedMs, 9_000);
    assert.equal(stalls[0].stalledForMs, 5_000);
  });

  it('does not count time the process did not run', () => {
    const { stalls } = setup();
    vi.advanceTimersByTime(2_000);
    // One tick observes an hour on the clock: the process was suspended, not stalled.
    vi.setSystemTime(Date.now() + 60 * 60_000);
    vi.advanceTimersByTime(1_000);
    assert.lengthOf(stalls, 0);
    vi.advanceTimersByTime(1_000);
    assert.lengthOf(stalls, 1);
    assert.equal(stalls[0].executedMs, 5_000);
  });

  it('never fires after dispose', () => {
    const { stalls, watchdog } = setup();
    vi.advanceTimersByTime(4_000);
    watchdog.dispose();
    vi.advanceTimersByTime(60_000);
    assert.lengthOf(stalls, 0);
  });
});
