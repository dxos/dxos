//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type PersistedStateStorage, migratePersistedState } from './migrate-persisted-state';

const STORAGE_KEY = 'org.dxos.plugin.deck.state';

/** Minimal in-memory `Storage` stand-in so the migration can be tested without a DOM environment. */
const makeStorage = (initial?: string): PersistedStateStorage => {
  const store = new Map<string, string>();
  if (initial !== undefined) {
    store.set(STORAGE_KEY, initial);
  }
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
  };
};

const legacyBlob = (decks: Record<string, unknown>, previousMode?: Record<string, unknown>) =>
  JSON.stringify({
    sidebarState: 'expanded',
    complementarySidebarState: 'collapsed',
    complementarySidebarPanel: undefined,
    activeDeck: 'default',
    previousDeck: 'default',
    decks,
    ...(previousMode ? { previousMode } : {}),
  });

const newDeck = (overrides: Partial<Record<string, unknown>> = {}) => ({
  active: [],
  inactive: [],
  plankSizing: {},
  companionOpen: false,
  companionFrameSizing: {},
  ...overrides,
});

describe('migratePersistedState', () => {
  test('no-ops when storage is unavailable', ({ expect }) => {
    expect(() => migratePersistedState(STORAGE_KEY, undefined)).not.toThrow();
  });

  test('no-ops when nothing is stored', ({ expect }) => {
    const storage = makeStorage();
    migratePersistedState(STORAGE_KEY, storage);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('promotes the solo plank to the front of active and strips legacy fields', ({ expect }) => {
    const storage = makeStorage(
      legacyBlob({
        default: newDeck({ solo: 'item-a', initialized: true, fullscreen: false, active: ['item-b', 'item-c'] }),
      }),
    );

    migratePersistedState(STORAGE_KEY, storage);

    const migrated = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(migrated.decks.default.active).toEqual(['item-a', 'item-b', 'item-c']);
    expect(migrated.decks.default.solo).toBeUndefined();
    expect(migrated.decks.default.initialized).toBeUndefined();
    expect(migrated.decks.default.fullscreen).toBeUndefined();
  });

  test('does not duplicate the solo plank when it is already the first active item', ({ expect }) => {
    const storage = makeStorage(legacyBlob({ default: newDeck({ solo: 'item-a', active: ['item-a', 'item-b'] }) }));

    migratePersistedState(STORAGE_KEY, storage);

    const migrated = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(migrated.decks.default.active).toEqual(['item-a', 'item-b']);
  });

  test('strips top-level previousMode', ({ expect }) => {
    const storage = makeStorage(legacyBlob({ default: newDeck() }, { default: 'solo' }));

    migratePersistedState(STORAGE_KEY, storage);

    const migrated = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(migrated.previousMode).toBeUndefined();
  });

  test('strips companionOrientation', ({ expect }) => {
    const storage = makeStorage(legacyBlob({ default: newDeck({ companionOrientation: 'vertical' }) }));

    migratePersistedState(STORAGE_KEY, storage);

    const migrated = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(migrated.decks.default.companionOrientation).toBeUndefined();
  });

  test('leaves an already new-shaped blob untouched', ({ expect }) => {
    const original = legacyBlob({ default: newDeck({ active: ['item-a'] }) });
    const storage = makeStorage(original);

    migratePersistedState(STORAGE_KEY, storage);

    expect(storage.getItem(STORAGE_KEY)).toBe(original);
  });

  test('removes the key on corrupt (unparseable) JSON', ({ expect }) => {
    const storage = makeStorage('{not json');

    migratePersistedState(STORAGE_KEY, storage);

    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('removes the key when the blob fails to decode', ({ expect }) => {
    const storage = makeStorage(JSON.stringify({ decks: 'not-a-record' }));

    migratePersistedState(STORAGE_KEY, storage);

    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });
});
