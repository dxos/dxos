//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DndCoordinator } from './coordinator';

describe('DndCoordinator', () => {
  test('container registration updates the snapshot and notifies subscribers', ({ expect }) => {
    const coordinator = new DndCoordinator();
    let notified = 0;
    const unsubscribe = coordinator.subscribe(() => notified++);

    const before = coordinator.getSnapshot();
    coordinator.addContainer({ id: 'c1' });
    const after = coordinator.getSnapshot();

    expect(notified).toBe(1);
    expect(after).not.toBe(before);
    expect(after.containers.c1).toBeDefined();

    coordinator.removeContainer('c1');
    expect(coordinator.getSnapshot().containers.c1).toBeUndefined();
    expect(notified).toBe(2);

    unsubscribe();
    coordinator.addContainer({ id: 'c2' });
    expect(notified).toBe(2);
  });

  test('registrations from one binding are visible to another sharing the coordinator', ({ expect }) => {
    // Two `Dnd.Root` bindings in separate React roots reduce to two subscribers of one
    // coordinator — cross-root visibility is just shared-snapshot visibility.
    const coordinator = new DndCoordinator();
    coordinator.addContainer({ id: 'from-root-a' });
    expect(coordinator.getSnapshot().containers['from-root-a']).toBeDefined();
  });
});
