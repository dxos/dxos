//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, expect, test } from 'vitest';

import { createProgressRegistry } from './progress-registry';

describe('createProgressRegistry', () => {
  test('register surfaces a task in the snapshot atom', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);

    const monitor = progress.register('sync/a', { label: 'Mailbox A', total: 10 });
    let snapshot = registry.get(progress.snapshotAtom);
    expect(snapshot.tasks).toHaveLength(1);
    expect(snapshot.tasks[0].name).toBe('sync/a');
    expect(snapshot.tasks[0].label).toBe('Mailbox A');
    expect(snapshot.tasks[0].total).toBe(10);

    monitor.advance(3);
    snapshot = registry.get(progress.snapshotAtom);
    expect(snapshot.tasks[0].current).toBe(3);
  });

  test('monitorAtom isolates one task and is stable per name', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    progress.register('sync/a', { label: 'A' }).set(2);
    progress.register('sync/b', { label: 'B' }).set(5);

    const atomA = progress.monitorAtom('sync/a');
    expect(progress.monitorAtom('sync/a')).toBe(atomA); // memoized
    expect(registry.get(atomA)?.current).toBe(2);
    expect(registry.get(progress.monitorAtom('sync/b'))?.current).toBe(5);
  });

  test('remove drops the task from the snapshot', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const monitor = progress.register('sync/a', { label: 'A' });
    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(1);
    monitor.remove();
    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(0);
    expect(registry.get(progress.monitorAtom('sync/a'))).toBeUndefined();
  });
});
