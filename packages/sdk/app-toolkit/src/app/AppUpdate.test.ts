//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type * as Capabilities from '@dxos/app-framework/Capabilities';

import * as AppUpdate from './AppUpdate.ts';

describe('followUpdate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = ({
    check = async () => {},
    install,
  }: { check?: () => Promise<void>; install?: () => Promise<void> } = {}) => {
    const registry = AtomRegistry.make();
    const status = Atom.make<AppUpdate.Status>({ kind: 'idle' });
    const apply = vi.fn(async () => {});
    const states: Capabilities.BootGateState[] = [];
    const onCheckFailed = vi.fn();
    const cleanup = AppUpdate.followUpdate(
      { check, install, apply },
      (listener) => registry.subscribe(status, listener, { immediate: true }),
      (state) => states.push(state),
      onCheckFailed,
    );
    return { emit: (next: AppUpdate.Status) => registry.set(status, next), states, apply, onCheckFailed, cleanup };
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

  test('starts a separate download once, and releases where there is none to start', () => {
    const install = vi.fn(async () => {});
    const native = setup({ install });
    native.emit({ kind: 'available', version: '1.2.3' });
    native.emit({ kind: 'downloading', progress: { completed: 10, total: 100, unit: 'bytes' } });
    native.emit({ kind: 'available', version: '1.2.3' });
    native.emit({ kind: 'ready' });
    expect(install).toHaveBeenCalledOnce();
    expect(native.states.every((state) => state.pending)).toBe(true);
    expect(native.apply).toHaveBeenCalledOnce();
    native.cleanup();

    const web = setup();
    web.emit({ kind: 'available', version: '1.2.3' });
    expect(web.states.at(-1)).toEqual({ pending: false });
    web.cleanup();
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

  test('releases on a failed check and reports it, whether the check rejects or reports it', async () => {
    const rejected = setup({ check: () => Promise.reject(new Error('offline')) });
    await Promise.resolve();
    expect(rejected.states.at(-1)).toEqual({ pending: false });
    expect(rejected.onCheckFailed).toHaveBeenCalledOnce();
    rejected.cleanup();

    const reported = setup();
    reported.emit({ kind: 'checking' });
    reported.emit({ kind: 'failed', error: 'offline' });
    expect(reported.states.at(-1)).toEqual({ pending: false });
    expect(reported.onCheckFailed).toHaveBeenCalledOnce();
    reported.cleanup();
  });

  test('releases a check at its budget however its status moves, and a download that stops progressing however often it reports', () => {
    const checking = setup();
    vi.advanceTimersByTime(AppUpdate.BOOT_GATE_CHECK_BUDGET - 1);
    checking.emit({ kind: 'checking' });
    vi.advanceTimersByTime(1);
    expect(checking.states.at(-1)).toEqual({ pending: false });
    expect(checking.onCheckFailed).not.toHaveBeenCalled();
    checking.cleanup();

    const downloading = setup();
    const at = (completed: number) => ({
      kind: 'downloading' as const,
      progress: { completed, total: 100, unit: 'bytes' as const },
    });
    downloading.emit(at(10));
    vi.advanceTimersByTime(AppUpdate.BOOT_GATE_STALL_BUDGET - 1);
    downloading.emit(at(20));
    vi.advanceTimersByTime(AppUpdate.BOOT_GATE_STALL_BUDGET - 1);
    downloading.emit(at(20));
    expect(downloading.states.at(-1)?.pending).toBe(true);
    vi.advanceTimersByTime(1);
    expect(downloading.states.at(-1)).toEqual({ pending: false });
    downloading.cleanup();
  });
});

describe('makeBootGate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('offline, starts released without checking', () => {
    vi.stubGlobal('navigator', { onLine: false });
    const registry = AtomRegistry.make();
    const check = vi.fn(async () => {});
    const gate = AppUpdate.makeBootGate(
      registry,
      { status: Atom.make<AppUpdate.Status>({ kind: 'idle' }), check, apply: async () => {} },
      true,
    );
    expect(registry.get(gate.state)).toEqual({ pending: false });
    expect(check).not.toHaveBeenCalled();
    gate.dispose();
  });

  test('leaves the status idle when the check fails', async () => {
    const registry = AtomRegistry.make();
    const status = Atom.make<AppUpdate.Status>({ kind: 'idle' });
    const check = async () => registry.set(status, { kind: 'failed', error: 'offline' });
    const gate = AppUpdate.makeBootGate(registry, { status, check, apply: async () => {} }, true);
    await Promise.resolve();
    expect(registry.get(gate.state)).toEqual({ pending: false });
    expect(registry.get(status)).toEqual({ kind: 'idle' });
    gate.dispose();
  });
});
