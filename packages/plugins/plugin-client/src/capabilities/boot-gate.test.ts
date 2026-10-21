//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import { MulticastObservable } from '@dxos/async';
import { type DataService } from '@dxos/protocols/rpc';

import {
  BOOT_GATE_FIRST_STATUS_BUDGET,
  BOOT_GATE_STALL_BUDGET,
  MAJOR_REINDEX_THRESHOLD,
  followIndexStatus,
  gateStateFor,
} from './boot-gate.ts';

describe('gateStateFor', () => {
  test('holds through migrations and a major rebuild, and releases otherwise', () => {
    expect(gateStateFor({ phase: 'migrating', done: 1, total: 4 })).toMatchObject({ pending: true, progress: 0.25 });
    expect(gateStateFor({ phase: 'indexing', done: 0, total: MAJOR_REINDEX_THRESHOLD })).toMatchObject({
      pending: true,
      count: { done: 0, total: MAJOR_REINDEX_THRESHOLD },
      progress: 0,
    });
    expect(gateStateFor({ phase: 'indexing', done: 0, total: MAJOR_REINDEX_THRESHOLD - 1 }).pending).toBe(false);
    expect(gateStateFor({ phase: 'idle', done: 0, total: 0 }).pending).toBe(false);
  });
});

describe('followIndexStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = async () => {
    let next: ((status: DataService.IndexStatus) => void) | undefined;
    const indexStatus = new MulticastObservable<DataService.IndexStatus | null>((observer) => {
      next = (status) => observer.next(status);
    }, null);
    const states: Capabilities.BootGateState[] = [];
    const cleanup = followIndexStatus(indexStatus, (state) => states.push(state));
    // The observable replays its current value as the subscription initializes, which zen-observable buffers until a microtask.
    await Promise.resolve();
    return { emit: (status: DataService.IndexStatus) => next?.(status), states, cleanup };
  };

  test('releases if no status arrives within the budget', async () => {
    const { states, cleanup } = await setup();
    vi.advanceTimersByTime(BOOT_GATE_FIRST_STATUS_BUDGET);
    expect(states).toEqual([{ pending: false }]);
    cleanup();
  });

  test('holds through a rebuild until it drains, and stays released after', async () => {
    const { emit, states, cleanup } = await setup();
    emit({ phase: 'indexing', done: 0, total: 1_000 });
    emit({ phase: 'indexing', done: 500, total: 1_000 });
    emit({ phase: 'idle', done: 0, total: 0 });
    emit({ phase: 'indexing', done: 0, total: 1_000 });
    expect(states.map((state) => state.pending)).toEqual([true, true, false]);
    cleanup();
  });

  test('a holding gate releases once statuses stop arriving', async () => {
    const { emit, states, cleanup } = await setup();
    emit({ phase: 'migrating', done: 0, total: 3 });
    vi.advanceTimersByTime(BOOT_GATE_STALL_BUDGET - 1);
    expect(states.at(-1)?.pending).toBe(true);
    vi.advanceTimersByTime(1);
    expect(states.at(-1)).toEqual({ pending: false });
    cleanup();
  });
});
