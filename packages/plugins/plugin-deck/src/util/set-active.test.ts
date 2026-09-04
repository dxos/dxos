//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { DeckSchema } from '#types';

import { computeActiveUpdates, expectationHolds } from './set-active';

const makeDeck = (overrides: Partial<DeckSchema.DeckState> = {}): DeckSchema.DeckState => ({
  ...DeckSchema.defaultDeck,
  ...overrides,
});

describe('computeActiveUpdates', () => {
  describe('active', () => {
    test('sets active to the requested list', ({ expect }) => {
      const deck = makeDeck({ active: [] });
      const { deckUpdates } = computeActiveUpdates({ next: ['item1'], deck });
      expect(deckUpdates.active).toEqual(['item1']);
    });

    test('replaces a multi-plank active list', ({ expect }) => {
      const deck = makeDeck({ active: ['a', 'b', 'c'] });
      const { deckUpdates } = computeActiveUpdates({ next: ['item1'], deck });
      expect(deckUpdates.active).toEqual(['item1']);
    });

    test('grows active with additional planks', ({ expect }) => {
      const deck = makeDeck({ active: ['a'] });
      const { deckUpdates } = computeActiveUpdates({ next: ['a', 'b'], deck });
      expect(deckUpdates.active).toEqual(['a', 'b']);
    });
  });

  describe('inactive handling', () => {
    test('moves removed items to inactive', ({ expect }) => {
      const deck = makeDeck({ active: ['a', 'b', 'c'] });
      const { deckUpdates } = computeActiveUpdates({ next: ['a', 'c'], deck });
      expect(deckUpdates.active).toEqual(['a', 'c']);
      expect(deckUpdates.inactive).toContain('b');
    });

    test('moves a displaced single active plank to inactive', ({ expect }) => {
      const deck = makeDeck({ active: ['old'] });
      const { deckUpdates } = computeActiveUpdates({ next: ['new'], deck });
      expect(deckUpdates.active).toEqual(['new']);
      expect(deckUpdates.inactive).toContain('old');
    });

    test('does not duplicate items already in inactive', ({ expect }) => {
      const deck = makeDeck({ active: ['old'], inactive: ['old'] });
      const { deckUpdates } = computeActiveUpdates({ next: ['new'], deck });
      const oldCount = deckUpdates.inactive.filter((id) => id === 'old').length;
      expect(oldCount).toBe(1);
    });
  });

  describe('companionPlanks', () => {
    // Entries survived every close, so a long-lived deck accreted one per plank ever opened — a live
    // profile measured fourteen, with duplicates.
    test('prunes companion state for planks no longer open, and dedupes', ({ expect }) => {
      const deck = makeDeck({ active: ['a', 'b'], companionPlanks: ['a', 'a', 'b', 'ghost'] });
      const { deckUpdates } = computeActiveUpdates({ next: ['a'], deck });
      expect(deckUpdates.companionPlanks).toEqual(['a']);
    });

    test('keeps companion state for planks that remain open', ({ expect }) => {
      const deck = makeDeck({ active: ['a', 'b'], companionPlanks: ['b'] });
      const { deckUpdates } = computeActiveUpdates({ next: ['a', 'b'], deck });
      expect(deckUpdates.companionPlanks).toEqual(['b']);
    });

    // Under `flatten` the flag is deck-wide, so closing the plank that happens to carry it must not
    // shut a companion the user never closed.
    test('re-points the deck-wide flag at the current plank under flatten', ({ expect }) => {
      const deck = makeDeck({ active: ['a', 'b'], companionPlanks: ['b'] });
      const { deckUpdates } = computeActiveUpdates({ next: ['a'], deck, flatten: true });
      expect(deckUpdates.companionPlanks).toEqual(['a']);
    });

    test('leaves the deck-wide flag closed under flatten', ({ expect }) => {
      const deck = makeDeck({ active: ['a', 'b'], companionPlanks: [] });
      const { deckUpdates } = computeActiveUpdates({ next: ['a'], deck, flatten: true });
      expect(deckUpdates.companionPlanks).toEqual([]);
    });
  });

  describe('empty next', () => {
    test('clears active when next is empty', ({ expect }) => {
      const deck = makeDeck({ active: ['a', 'b'] });
      const { deckUpdates } = computeActiveUpdates({ next: [], deck });
      expect(deckUpdates.active).toEqual([]);
      expect(deckUpdates.inactive).toEqual(expect.arrayContaining(['a', 'b']));
    });
  });
});

describe('expectationHolds', () => {
  test('a caller that states no expectation always wins', ({ expect }) => {
    expect(expectationHolds([], undefined)).toBe(true);
    expect(expectationHolds(['item1'], undefined)).toBe(true);
  });

  test('an automatic write applies while the reader has not moved', ({ expect }) => {
    expect(expectationHolds([], [])).toBe(true);
    expect(expectationHolds(['item1'], ['item1'])).toBe(true);
  });

  test('an automatic write is dropped once the reader has opened something', ({ expect }) => {
    expect(expectationHolds(['settings'], [])).toBe(false);
  });

  test('and once they have closed everything', ({ expect }) => {
    expect(expectationHolds([], ['item1'])).toBe(false);
  });

  test('reordering the same planks is a different view, so the write is dropped', ({ expect }) => {
    expect(expectationHolds(['item1', 'item2'], ['item2', 'item1'])).toBe(false);
  });

  test('a longer deck sharing its prefix is not a match', ({ expect }) => {
    expect(expectationHolds(['item1', 'item2'], ['item1'])).toBe(false);
  });
});
