//
// Copyright 2026 DXOS.org
//

import { type Mock, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { MulticastObservable } from '@dxos/async';
import { type DataService } from '@dxos/protocols/rpc';

import { INDEX_PROGRESS_DEBOUNCE, followIndexProgress } from './index-progress.ts';

describe('followIndexProgress', () => {
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
    let nextActivity: ((activity: DataService.IndexActivity) => void) | undefined;
    const indexActivity = new MulticastObservable<DataService.IndexActivity>((observer) => {
      nextActivity = (activity) => observer.next(activity);
    }, {});
    const monitors = new Map<string, { set: Mock; total: Mock; remove: Mock }>();
    const register = vi.fn((key: string, _options?: { label?: string }) => {
      const monitor = { set: vi.fn(), total: vi.fn(), remove: vi.fn() };
      monitors.set(key, monitor);
      return monitor as unknown as AppCapabilities.ProgressMonitor;
    });
    const cleanup = followIndexProgress({ indexStatus, indexActivity }, { register });
    // The observable replays its current value as the subscription initializes, which zen-observable buffers until a microtask.
    await Promise.resolve();
    return {
      emit: (status: DataService.IndexStatus) => next?.(status),
      emitActivity: (activity: DataService.IndexActivity) => nextActivity?.(activity),
      register,
      monitors,
      cleanup,
    };
  };

  test('index work that ends within the debounce never shows', async () => {
    const { emit, register, cleanup } = await setup();
    emit({ phase: 'indexing', done: 0, total: 10 });
    vi.advanceTimersByTime(INDEX_PROGRESS_DEBOUNCE - 1);
    emit({ phase: 'idle', done: 0, total: 0 });
    vi.advanceTimersByTime(INDEX_PROGRESS_DEBOUNCE);
    expect(register).not.toHaveBeenCalled();
    cleanup();
  });

  test('longer work shows its progress, then is removed once idle', async () => {
    const { emit, register, monitors, cleanup } = await setup();
    emit({ phase: 'indexing', done: 0, total: 1_000 });
    vi.advanceTimersByTime(INDEX_PROGRESS_DEBOUNCE);
    expect(register).toHaveBeenCalledTimes(1);
    const monitor = monitors.get('org.dxos.plugin.client.index')!;
    emit({ phase: 'indexing', done: 400, total: 1_000 });
    expect(monitor.set).toHaveBeenLastCalledWith(400);
    expect(monitor.total).toHaveBeenLastCalledWith(1_000);
    emit({ phase: 'idle', done: 0, total: 0 });
    expect(monitor.remove).toHaveBeenCalled();
    cleanup();
  });

  test('a migration that runs straight into a rebuild relabels its entry', async () => {
    const { emit, register, cleanup } = await setup();
    emit({ phase: 'migrating', done: 0, total: 2 });
    vi.advanceTimersByTime(INDEX_PROGRESS_DEBOUNCE);
    emit({ phase: 'indexing', done: 0, total: 1_000 });
    expect(register.mock.calls.map(([, options]) => options?.label)).toEqual([
      'Migrating database',
      'Updating database index',
    ]);
    cleanup();
  });

  test('catch-up and full-text work each show and end on their own', async () => {
    const { emitActivity, register, monitors, cleanup } = await setup();
    emitActivity({ catchUp: { done: 0, total: 200 }, fullText: { done: 0, total: 900 } });
    vi.advanceTimersByTime(INDEX_PROGRESS_DEBOUNCE);
    expect(register.mock.calls.map(([key, options]) => [key, options?.label])).toEqual([
      ['org.dxos.plugin.client.index.catchUp', 'Catching up database index'],
      ['org.dxos.plugin.client.index.fullText', 'Updating search index'],
    ]);

    emitActivity({ fullText: { done: 300, total: 900 } });
    expect(monitors.get('org.dxos.plugin.client.index.catchUp')!.remove).toHaveBeenCalled();
    expect(monitors.get('org.dxos.plugin.client.index.fullText')!.set).toHaveBeenLastCalledWith(300);
    expect(monitors.get('org.dxos.plugin.client.index.fullText')!.remove).not.toHaveBeenCalled();
    cleanup();
  });
});
