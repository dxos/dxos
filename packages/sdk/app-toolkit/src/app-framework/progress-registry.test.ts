//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { makeRegistry } from './progress-registry.ts';

describe('makeRegistry', () => {
  test('register surfaces a task in the snapshot atom', () => {
    const registry = Registry.make();
    const progress = makeRegistry(registry);

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
    const progress = makeRegistry(registry);
    progress.register('sync/a', { label: 'A' }).set(2);
    progress.register('sync/b', { label: 'B' }).set(5);

    const atomA = progress.monitorAtom('sync/a');
    expect(progress.monitorAtom('sync/a')).toBe(atomA); // memoized
    expect(registry.get(atomA)?.current).toBe(2);
    expect(registry.get(progress.monitorAtom('sync/b'))?.current).toBe(5);
  });

  test('re-registering a name starts fresh (drops prior errored state)', () => {
    const registry = Registry.make();
    const progress = makeRegistry(registry);

    const first = progress.register('sync/a', { label: 'A' });
    first.advance(5);
    first.fail('boom');
    let state = registry.get(progress.monitorAtom('sync/a'));
    expect(state?.status).toBe('error');
    expect(state?.current).toBe(5);

    // A retry re-registers the same name; it must not resume the failed run's count/error.
    progress.register('sync/a', { label: 'A' });
    state = registry.get(progress.monitorAtom('sync/a'));
    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(1);
    expect(state?.current).toBe(0);
    expect(state?.status).toBe('running');
    expect(state?.error).toBeUndefined();
  });

  test('remove drops the task from the snapshot', () => {
    const registry = Registry.make();
    const progress = makeRegistry(registry);
    const monitor = progress.register('sync/a', { label: 'A' });
    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(1);
    monitor.remove();
    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(0);
    expect(registry.get(progress.monitorAtom('sync/a'))).toBeUndefined();
  });

  test('objectMonitorsAtom notifies only when its own object monitors change', () => {
    const registry = Registry.make();
    const progress = makeRegistry(registry);
    const atom = progress.objectMonitorsAtom('dxn:a');
    expect(progress.objectMonitorsAtom('dxn:a')).toBe(atom);

    let notifications = -1;
    const unsubscribe = registry.subscribe(atom, () => notifications++, { immediate: true });
    const other = progress.register('dxn:b#run', { label: 'B' });
    other.advance(1);
    other.advance(1);
    expect(registry.get(atom)).toHaveLength(0);
    expect(notifications).toBe(0);

    const own = progress.register('dxn:a#run', { label: 'A' });
    expect(registry.get(atom).map((task) => task.name)).toEqual(['dxn:a#run']);
    expect(notifications).toBe(1);
    other.advance(1);
    expect(notifications).toBe(1);
    own.fail('boom');
    expect(registry.get(atom)[0].status).toBe('error');
    expect(notifications).toBe(2);
    unsubscribe();
  });
});
