//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, test } from 'vitest';

import { LocalBackend, MemoryBackend, ViewState } from '@dxos/react-ui-attention';

import { navTreeOpenAspect } from './nav-tree-view-state';

// Minimal in-memory Storage stand-in (no real localStorage in the test runner).
const fakeStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
  } as Storage;
};

const makeManager = (registry: Registry.Registry, storage: Storage) =>
  new ViewState.Manager({
    registry,
    backends: { memory: new MemoryBackend(), local: new LocalBackend({ registry, storage }) },
  });

describe('navTreeOpenAspect', () => {
  test('declares a local aspect that defaults to collapsed', ({ expect }) => {
    expect(navTreeOpenAspect.key).toEqual('navtree-open');
    expect(navTreeOpenAspect.backend).toEqual('local');
    expect(navTreeOpenAspect.defaultValue()).toEqual({ open: false });
  });

  test('expansion persists per path and re-seeds on reload', ({ expect }) => {
    const storage = fakeStorage();

    // First session: expand two paths.
    const first = makeManager(Registry.make(), storage);
    first.set(navTreeOpenAspect, 'root~a', { open: true });
    first.set(navTreeOpenAspect, 'root~b', { open: true });

    // Second session (new registry + manager, same storage) mirrors a reload: the persisted paths and
    // their `open` values are recovered via `contexts` + `get` — exactly how navtree seeds backingState.
    const second = makeManager(Registry.make(), storage);
    expect(second.contexts(navTreeOpenAspect).toSorted()).toEqual(['root~a', 'root~b']);
    expect(second.get(navTreeOpenAspect, 'root~a')).toEqual({ open: true });
    expect(second.get(navTreeOpenAspect, 'unseen')).toEqual({ open: false });
  });
});
