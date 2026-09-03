//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ObjectCore } from './object-core';
import { ObjectCoreRegistry, PIN_TTL } from './object-core-registry';

describe('ObjectCoreRegistry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('holds one instance per id', () => {
    const registry = new ObjectCoreRegistry();
    const core = new ObjectCore();
    registry.set(core.id, core);
    expect(registry.get(core.id)).to.eq(core);
    expect(registry.has(core.id)).to.be.true;
    expect(registry.keys()).to.deep.eq([core.id]);
  });

  test('a touch does not arm a timer per call', () => {
    const registry = new ObjectCoreRegistry();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    for (let i = 0; i < 100; i++) {
      const core = new ObjectCore();
      registry.set(core.id, core);
      registry.get(core.id);
    }
    expect(setTimeoutSpy).toHaveBeenCalledOnce();
  });

  test('the sweep stops once nothing is pinned', () => {
    const registry = new ObjectCoreRegistry();
    const core = new ObjectCore();
    registry.set(core.id, core);
    vi.advanceTimersByTime(PIN_TTL);
    expect(vi.getTimerCount()).to.eq(0);
  });

  test('a touch inside the window keeps the sweep running', () => {
    const registry = new ObjectCoreRegistry();
    const core = new ObjectCore();
    registry.set(core.id, core);
    vi.advanceTimersByTime(PIN_TTL - 1);
    registry.get(core.id);
    // The first sweep sees a fresh touch, so it re-arms rather than draining.
    vi.advanceTimersByTime(1);
    expect(vi.getTimerCount()).to.eq(1);
    vi.advanceTimersByTime(2 * PIN_TTL);
    expect(vi.getTimerCount()).to.eq(0);
  });

  test('a wall-clock jump does not unpin a core touched moments ago', () => {
    const registry = new ObjectCoreRegistry();
    const first = new ObjectCore();
    registry.set(first.id, first);
    const second = new ObjectCore();
    vi.advanceTimersByTime(PIN_TTL - 10);
    registry.set(second.id, second);

    // An NTP correction moves the wall clock without advancing elapsed time. `second` was touched
    // 10ms ago, so the sweep the first core's TTL arms must keep it: expiry reads a monotonic clock,
    // against which the jump is invisible.
    const wallClock = Date.now;
    vi.spyOn(Date, 'now').mockImplementation(() => wallClock.call(Date) + 60 * 60 * 1000);
    vi.advanceTimersByTime(10);

    // A pin remains, so the sweep re-armed rather than draining `second` along with `first`.
    expect(vi.getTimerCount()).to.eq(1);
  });

  test('clear drops the index and disarms the sweep', () => {
    const registry = new ObjectCoreRegistry();
    const core = new ObjectCore();
    registry.set(core.id, core);
    registry.clear();
    expect(vi.getTimerCount()).to.eq(0);
    expect(registry.size).to.eq(0);
    expect(registry.get(core.id)).to.be.undefined;
  });

  test('delete drops the entry without notifying onRelease', () => {
    const released: string[] = [];
    const registry = new ObjectCoreRegistry({ onRelease: (id) => released.push(id) });
    const core = new ObjectCore();
    registry.set(core.id, core);
    expect(registry.delete(core.id)).to.be.true;
    expect(registry.get(core.id)).to.be.undefined;
    expect(released).to.deep.eq([]);
  });
});
