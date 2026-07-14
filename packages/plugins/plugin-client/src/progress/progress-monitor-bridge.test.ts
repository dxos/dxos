//
// Copyright 2026 DXOS.org
//

import { describe, expect, it, vi } from 'vitest';

import { type AppCapabilities } from '@dxos/app-toolkit';

import { ProgressMonitorBridge } from './progress-monitor-bridge';

type MockHandle = {
  advance: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  total: ReturnType<typeof vi.fn>;
  estimate: ReturnType<typeof vi.fn>;
  note: ReturnType<typeof vi.fn>;
  done: ReturnType<typeof vi.fn>;
  fail: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

const createHandle = (): MockHandle => ({
  advance: vi.fn(),
  set: vi.fn(),
  total: vi.fn(),
  estimate: vi.fn(),
  note: vi.fn(),
  done: vi.fn(),
  fail: vi.fn(),
  remove: vi.fn(),
});

const createRegistry = () => {
  const register = vi.fn((_name: string, _options?: { label?: string; total?: number }) => createHandle());

  const registry = {
    snapshotAtom: {} as AppCapabilities.ProgressRegistry['snapshotAtom'],
    monitorAtom: vi.fn(),
    cancel: vi.fn(),
    snapshot: () => ({ updatedAt: '', tasks: [] }),
    register,
  } satisfies AppCapabilities.ProgressRegistry;

  return { registry, register };
};

describe('ProgressMonitorBridge', () => {
  it('registers once and fans out updates to every registry', () => {
    const first = createRegistry();
    const second = createRegistry();
    const bridge = new ProgressMonitorBridge([first.registry, second.registry]);

    bridge.update('space:test#feeds', { label: 'Feeds', current: 1, total: 10, note: 'data: 2' });
    bridge.update('space:test#feeds', { label: 'Feeds', current: 2, total: 10, note: 'data: 1' });

    expect(first.register).toHaveBeenCalledTimes(1);
    expect(second.register).toHaveBeenCalledTimes(1);

    const firstHandle = first.register.mock.results[0]?.value as MockHandle;
    const secondHandle = second.register.mock.results[0]?.value as MockHandle;
    expect(firstHandle.set).toHaveBeenLastCalledWith(2);
    expect(secondHandle.set).toHaveBeenLastCalledWith(2);
    expect(firstHandle.note).toHaveBeenLastCalledWith('data: 1');
  });

  it('removes handles from every registry', () => {
    const { registry, register } = createRegistry();
    const bridge = new ProgressMonitorBridge([registry]);

    bridge.update('space:test#replication', { label: 'Space', current: 1, total: 5 });
    const handle = register.mock.results[0]?.value as MockHandle;
    bridge.remove('space:test#replication');

    expect(handle.remove).toHaveBeenCalledTimes(1);
    bridge.update('space:test#replication', { label: 'Space', current: 0, total: 5 });
    expect(register).toHaveBeenCalledTimes(2);
  });

  it('clears all active monitors', () => {
    const { registry, register } = createRegistry();
    const bridge = new ProgressMonitorBridge([registry]);

    bridge.update('a', { label: 'A', current: 1 });
    bridge.update('b', { label: 'B', current: 2 });
    bridge.clear();

    expect((register.mock.results[0]?.value as MockHandle).remove).toHaveBeenCalled();
    expect((register.mock.results[1]?.value as MockHandle).remove).toHaveBeenCalled();
  });
});
