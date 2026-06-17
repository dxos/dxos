//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { SpaceId } from '@dxos/keys';

import { createLocalStorageBranchStore } from './branch-store';

// A minimal in-memory localStorage stand-in (sdk/client tests run in node, where it is absent).
const installLocalStorage = (): Map<string, string> => {
  const map = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
  return map;
};

const spaceId = SpaceId.random();

describe('createLocalStorageBranchStore', () => {
  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  test('round-trips the selection map', async ({ expect }) => {
    installLocalStorage();
    const store = createLocalStorageBranchStore(spaceId);
    await store.save({ obj1: 'b1', obj2: 'b2' });
    expect(await store.load()).toEqual({ obj1: 'b1', obj2: 'b2' });
  });

  test('saving an empty map clears the persisted entry', async ({ expect }) => {
    const backing = installLocalStorage();
    const store = createLocalStorageBranchStore(spaceId);
    await store.save({ obj1: 'b1' });
    expect(backing.size).toBe(1);
    await store.save({});
    expect(backing.size).toBe(0);
    expect(await store.load()).toEqual({});
  });

  test('selection is namespaced per space', async ({ expect }) => {
    installLocalStorage();
    const a = createLocalStorageBranchStore(SpaceId.random());
    const b = createLocalStorageBranchStore(SpaceId.random());
    await a.save({ obj: 'a-branch' });
    await b.save({ obj: 'b-branch' });
    expect(await a.load()).toEqual({ obj: 'a-branch' });
    expect(await b.load()).toEqual({ obj: 'b-branch' });
  });

  test('load tolerates corrupt persisted data', async ({ expect }) => {
    const backing = installLocalStorage();
    const store = createLocalStorageBranchStore(spaceId);
    backing.set(`dxos.org/echo/branches/${spaceId}`, '{not json');
    expect(await store.load()).toEqual({});
  });

  describe('without localStorage (node / worker)', () => {
    beforeEach(() => {
      delete (globalThis as any).localStorage;
    });

    test('load returns empty and save is a no-op (selection stays in memory)', async ({ expect }) => {
      const store = createLocalStorageBranchStore(spaceId);
      expect(await store.load()).toEqual({});
      await store.save({ obj1: 'b1' }); // Must not throw.
      expect(await store.load()).toEqual({});
    });
  });
});
