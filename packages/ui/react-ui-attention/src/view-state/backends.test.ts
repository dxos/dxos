//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { afterEach, describe, test } from 'vitest';

import { LocalBackend } from './backends';
import { ViewStateManager, defineViewState } from './view-state';

const Editor = defineViewState({
  key: 'editor',
  backend: 'local',
  schema: Schema.Struct({ scrollTo: Schema.optional(Schema.Number) }).pipe(Schema.mutable),
  defaultValue: () => ({}),
});

// Minimal in-memory Storage stand-in (no real localStorage in the test runner).
const fakeStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
};

describe('LocalBackend', () => {
  // Dispose every backend after each test so its global `storage` listener does not leak across the suite.
  const disposables: LocalBackend[] = [];
  afterEach(() => {
    disposables.splice(0).forEach((backend) => backend.dispose());
  });

  const make = () => {
    const registry = Registry.make();
    const storage = fakeStorage();
    const local = new LocalBackend({ registry, storage });
    disposables.push(local);
    const manager = new ViewStateManager({ registry, backends: { memory: local, local } });
    return { manager, storage };
  };

  test('default until written', ({ expect }) => {
    const { manager } = make();
    expect(manager.get(Editor, 'doc-1')).toEqual({});
  });

  test('set persists encoded JSON under the namespaced key', ({ expect }) => {
    const { manager, storage } = make();
    manager.set(Editor, 'doc-1', { scrollTo: 42 });
    expect(JSON.parse(storage.getItem('dxos:view-state:editor:doc-1')!)).toEqual({ scrollTo: 42 });
  });

  test('reading does not write defaults to storage', ({ expect }) => {
    const { manager, storage } = make();
    manager.get(Editor, 'doc-1');
    expect(storage.getItem('dxos:view-state:editor:doc-1')).toBeNull();
  });

  test('seeds atom from pre-existing storage value', ({ expect }) => {
    const { manager, storage } = make();
    storage.setItem('dxos:view-state:editor:doc-2', JSON.stringify({ scrollTo: 7 }));
    expect(manager.get(Editor, 'doc-2')).toEqual({ scrollTo: 7 });
  });

  test('falls back to default on unparseable storage value', ({ expect }) => {
    const { manager, storage } = make();
    storage.setItem('dxos:view-state:editor:doc-3', '{not json');
    expect(manager.get(Editor, 'doc-3')).toEqual({});
  });

  test('contexts enumerates persisted contexts', ({ expect }) => {
    const { manager } = make();
    manager.set(Editor, 'doc-1', { scrollTo: 1 });
    manager.set(Editor, 'doc-2', { scrollTo: 2 });
    expect(new Set(manager.contexts(Editor))).toEqual(new Set(['doc-1', 'doc-2']));
  });

  test('a cross-tab storage event re-reads the atom from storage', ({ expect }) => {
    const registry = Registry.make();
    const storage = fakeStorage();
    const local = new LocalBackend({ registry, storage });
    const manager = new ViewStateManager({ registry, backends: { memory: local, local } });

    // Touch the context so its atom is registered and observed by the storage listener.
    const key = 'dxos:view-state:editor:doc-4';
    expect(manager.get(Editor, 'doc-4')).toEqual({});

    // Simulate another tab's write: update storage, then fire the `storage` event (the listener
    // re-reads from storage rather than trusting the event payload).
    storage.setItem(key, JSON.stringify({ scrollTo: 99 }));
    globalThis.dispatchEvent(new StorageEvent('storage', { key, newValue: storage.getItem(key) }));

    expect(manager.get(Editor, 'doc-4')).toEqual({ scrollTo: 99 });
    local.dispose();
  });
});
