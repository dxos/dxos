//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { defaultDeck, type DeckState, type DeckStateProps } from '../types';

import { sanitizePersistedState } from './sanitize-persisted-state';

const makeState = (decks: Record<string, Partial<DeckState>>): DeckStateProps => ({
  sidebarState: 'expanded',
  complementarySidebarState: 'collapsed',
  complementarySidebarPanel: undefined,
  activeDeck: Object.keys(decks)[0] ?? 'default',
  previousDeck: 'default',
  decks: Object.fromEntries(
    Object.entries(decks).map(([id, overrides]) => [id, { ...defaultDeck, ...overrides }]),
  ),
  previousMode: {},
});

describe('sanitizePersistedState', () => {
  test('returns same reference when no cleanup needed', ({ expect }) => {
    const state = makeState({ default: {} });
    expect(sanitizePersistedState(state)).toBe(state);
  });

  test('clears fullscreen on any deck', ({ expect }) => {
    const state = makeState({ ws1: { fullscreen: true } });
    const result = sanitizePersistedState(state);
    expect(result.decks.ws1?.fullscreen).toBe(false);
  });

  test('clears active for solo-mode decks', ({ expect }) => {
    const state = makeState({ ws1: { solo: 'item-a', active: ['item-b', 'item-c'] } });
    const result = sanitizePersistedState(state);
    expect(result.decks.ws1?.active).toEqual([]);
    expect(result.decks.ws1?.solo).toBe('item-a');
  });

  test('preserves active for deck-mode decks (no solo)', ({ expect }) => {
    const state = makeState({ ws1: { active: ['item-a', 'item-b'], initialized: true } });
    const result = sanitizePersistedState(state);
    expect(result).toBe(state);
  });

  test('does not clear active when it is already empty', ({ expect }) => {
    const state = makeState({ ws1: { solo: 'item-a', active: [] } });
    expect(sanitizePersistedState(state)).toBe(state);
  });

  test('cleans multiple decks independently', ({ expect }) => {
    const state = makeState({
      ws1: { solo: 'item-a', active: ['item-b'] },
      ws2: { active: ['item-c'], initialized: true },
      ws3: { fullscreen: true, solo: 'item-d', active: ['item-e'] },
    });
    const result = sanitizePersistedState(state);

    // ws1: solo with active → active cleared.
    expect(result.decks.ws1?.active).toEqual([]);
    expect(result.decks.ws1?.solo).toBe('item-a');

    // ws2: deck mode, no solo → untouched.
    expect(result.decks.ws2?.active).toEqual(['item-c']);

    // ws3: fullscreen + solo with active → both cleared.
    expect(result.decks.ws3?.fullscreen).toBe(false);
    expect(result.decks.ws3?.active).toEqual([]);
    expect(result.decks.ws3?.solo).toBe('item-d');
  });

  test('does not mutate the original state', ({ expect }) => {
    const state = makeState({ ws1: { solo: 'item-a', active: ['item-b'], fullscreen: true } });
    const originalActive = [...state.decks.ws1!.active];
    sanitizePersistedState(state);
    expect(state.decks.ws1?.active).toEqual(originalActive);
    expect(state.decks.ws1?.fullscreen).toBe(true);
  });
});
