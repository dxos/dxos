//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';

import { type MigratableSpace, type MigratableSpaceList, watchSpaceMigrations } from './space-migrations.ts';

type FakeSpace = MigratableSpace & {
  ready: Trigger;
  migrated: number;
  watching: boolean;
};

const makeSpace = (id: string): FakeSpace => {
  const ready = new Trigger();
  const space: FakeSpace = {
    id,
    ready,
    migrated: 0,
    watching: false,
    waitUntilReady: () => ready.wait(),
    internal: {
      db: {
        runMigrations: async () => {
          space.migrated++;
        },
        watchFoldForward: () => {
          space.watching = true;
          return () => {
            space.watching = false;
          };
        },
      },
    },
  };
  return space;
};

const makeSpaceList = (initial: FakeSpace[]) => {
  let current: readonly MigratableSpace[] = initial;
  const listeners = new Set<(spaces: readonly MigratableSpace[]) => void>();
  const list: MigratableSpaceList = {
    get: () => current,
    subscribe: (next) => {
      listeners.add(next);
      return { unsubscribe: () => listeners.delete(next) };
    },
  };
  const set = (spaces: FakeSpace[]) => {
    current = spaces;
    listeners.forEach((listener) => listener(spaces));
  };
  return { list, set };
};

describe('watchSpaceMigrations', () => {
  test('migrates and watches a space only once it is ready', async () => {
    const space = makeSpace('a');
    const { list } = makeSpaceList([space]);
    const watcher = watchSpaceMigrations(
      list,
      () => [],
      () => {},
    );

    expect(space.migrated).toBe(0);
    space.ready.wake();
    await expect.poll(() => space.migrated).toBe(1);
    expect(space.watching).toBe(true);
    watcher.close();
  });

  test('a space joined later is migrated and watched once ready; one that leaves is unwatched', async () => {
    const first = makeSpace('a');
    first.ready.wake();
    const { list, set } = makeSpaceList([first]);
    const watcher = watchSpaceMigrations(
      list,
      () => [],
      () => {},
    );
    await expect.poll(() => first.watching).toBe(true);

    const joined = makeSpace('b');
    set([first, joined]);
    joined.ready.wake();
    await expect.poll(() => joined.migrated).toBe(1);
    expect(joined.watching).toBe(true);

    set([joined]);
    expect(first.watching).toBe(false);
    watcher.close();
    expect(joined.watching).toBe(false);
  });

  test('a space that leaves before it is ready is never watched', async () => {
    const space = makeSpace('a');
    const { list, set } = makeSpaceList([space]);
    const watcher = watchSpaceMigrations(
      list,
      () => [],
      () => {},
    );

    set([]);
    space.ready.wake();
    await space.ready.wait();
    await Promise.resolve();
    expect(space.watching).toBe(false);
    expect(space.migrated).toBe(0);
    watcher.close();
  });

  test('rerun migrates every ready space again', async () => {
    const space = makeSpace('a');
    space.ready.wake();
    const { list } = makeSpaceList([space]);
    const watcher = watchSpaceMigrations(
      list,
      () => [],
      () => {},
    );
    await expect.poll(() => space.migrated).toBe(1);

    watcher.rerun();
    await expect.poll(() => space.migrated).toBe(2);
    watcher.close();
  });
});
