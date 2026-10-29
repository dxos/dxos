//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as AppUpdate from '@dxos/app-toolkit/AppUpdate';

import { BOOT_GATE_CHECK_BUDGET, BOOT_GATE_STALL_BUDGET, followUpdate } from './boot-gate.ts';

describe('followUpdate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = ({ check = async () => {} }: { check?: () => Promise<void> } = {}) => {
    const registry = AtomRegistry.make();
    const status = Atom.make<AppUpdate.Status>({ kind: 'idle' });
    const apply = vi.fn(async () => {});
    const states: Capabilities.BootGateState[] = [];
    const cleanup = followUpdate(
      { check, apply },
      (listener) => registry.subscribe(status, listener, { immediate: true }),
      (state) => states.push(state),
    );
    return { emit: (next: AppUpdate.Status) => registry.set(status, next), states, apply, cleanup };
  };

  test('holds through a download, then applies the update instead of releasing', () => {
    const { emit, states, apply, cleanup } = setup();
    emit({ kind: 'checking' });
    emit({ kind: 'downloading', progress: { completed: 50, total: 200, unit: 'entries' } });
    emit({ kind: 'ready' });

    expect(states.map((state) => state.pending)).toEqual([true, true, true, true]);
    expect(states[2]).toMatchObject({ status: 'Downloading update', progress: 0.25 });
    expect(apply).toHaveBeenCalledOnce();
    cleanup();
  });

  test('releases when the check finds nothing, and stays released after', () => {
    const { emit, states, apply, cleanup } = setup();
    emit({ kind: 'checking' });
    emit({ kind: 'up-to-date', checkedAt: 0 });
    emit({ kind: 'ready' });

    expect(states.at(-1)).toEqual({ pending: false });
    expect(states.filter((state) => !state.pending)).toHaveLength(1);
    expect(apply).not.toHaveBeenCalled();
    cleanup();
  });

  test('releases on a failed check', async () => {
    const { states, cleanup } = setup({ check: () => Promise.reject(new Error('offline')) });
    // Lets the rejection handler run; no timer is advanced, so the budget cannot be what released it.
    await Promise.resolve();

    expect(states.at(-1)).toEqual({ pending: false });
    cleanup();
  });

  test('releases a check that never settles, and a download that stops progressing', () => {
    const checking = setup();
    vi.advanceTimersByTime(BOOT_GATE_CHECK_BUDGET);
    expect(checking.states.at(-1)).toEqual({ pending: false });
    checking.cleanup();

    const downloading = setup();
    downloading.emit({ kind: 'downloading' });
    vi.advanceTimersByTime(BOOT_GATE_STALL_BUDGET - 1);
    expect(downloading.states.at(-1)?.pending).toBe(true);
    vi.advanceTimersByTime(1);
    expect(downloading.states.at(-1)).toEqual({ pending: false });
    downloading.cleanup();
  });
});
