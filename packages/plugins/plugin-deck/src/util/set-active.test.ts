//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { defaultDeck, type DeckState } from '#types';

import { computeActiveUpdates } from './set-active';

const makeDeck = (overrides: Partial<DeckState> = {}): DeckState => ({
  ...defaultDeck,
  ...overrides,
});

describe('computeActiveUpdates', () => {
  describe('routing to solo vs active', () => {
    test('routes to solo when initialized is false and solo is undefined', ({ expect }) => {
      const deck = makeDeck({ initialized: false });
      const { deckUpdates } = computeActiveUpdates({ next: ['item1'], deck });
      expect(deckUpdates.solo).toBe('item1');
      expect(deckUpdates.active).toEqual([]);
    });

    test('routes to solo when solo is set (regardless of initialized)', ({ expect }) => {
      const deck = makeDeck({ solo: 'current', initialized: true });
      const { deckUpdates } = computeActiveUpdates({ next: ['item1'], deck });
      expect(deckUpdates.solo).toBe('item1');
      expect(deckUpdates.active).toEqual([]);
    });

    test('routes to active when initialized is true and solo is undefined', ({ expect }) => {
      const deck = makeDeck({ initialized: true });
      const { deckUpdates } = computeActiveUpdates({ next: ['item1', 'item2'], deck });
      expect(deckUpdates.solo).toBeUndefined();
      expect(deckUpdates.active).toEqual(['item1', 'item2']);
    });
  });

  describe('active preservation', () => {
    test('preserves active unchanged when routing to solo', ({ expect }) => {
      const deck = makeDeck({ solo: 'current', active: ['a', 'b', 'c'], initialized: true });
      const { deckUpdates } = computeActiveUpdates({ next: ['item1'], deck });
      expect(deckUpdates.solo).toBe('item1');
      expect(deckUpdates.active).toEqual(['a', 'b', 'c']);
    });

    test('preserves active when initialized is false', ({ expect }) => {
      const deck = makeDeck({ initialized: false, active: ['stale'] });
      const { deckUpdates } = computeActiveUpdates({ next: ['item1'], deck });
      expect(deckUpdates.solo).toBe('item1');
      expect(deckUpdates.active).toEqual(['stale']);
    });
  });

  describe('inactive handling', () => {
    test('moves removed items to inactive', ({ expect }) => {
      const deck = makeDeck({ initialized: true, active: ['a', 'b', 'c'] });
      const { deckUpdates } = computeActiveUpdates({ next: ['a', 'c'], deck });
      expect(deckUpdates.active).toEqual(['a', 'c']);
      expect(deckUpdates.inactive).toContain('b');
    });

    test('moves displaced solo item to inactive', ({ expect }) => {
      const deck = makeDeck({ solo: 'old', initialized: true });
      const { deckUpdates } = computeActiveUpdates({ next: ['new'], deck });
      expect(deckUpdates.solo).toBe('new');
      expect(deckUpdates.inactive).toContain('old');
    });

    test('does not duplicate items already in inactive', ({ expect }) => {
      const deck = makeDeck({ solo: 'old', initialized: true, inactive: ['old'] });
      const { deckUpdates } = computeActiveUpdates({ next: ['new'], deck });
      const oldCount = deckUpdates.inactive.filter((id) => id === 'old').length;
      expect(oldCount).toBe(1);
    });
  });

  describe('fullscreen', () => {
    test('clears fullscreen when solo is cleared', ({ expect }) => {
      const deck = makeDeck({ solo: 'item', fullscreen: true, initialized: true });
      const { deckUpdates } = computeActiveUpdates({ next: [], deck });
      expect(deckUpdates.fullscreen).toBe(false);
    });

    test('preserves fullscreen when solo is set', ({ expect }) => {
      const deck = makeDeck({ solo: 'old', fullscreen: true, initialized: true });
      const { deckUpdates } = computeActiveUpdates({ next: ['new'], deck });
      expect(deckUpdates.fullscreen).toBe(true);
    });
  });

  describe('empty next', () => {
    test('clears solo when next is empty and in solo mode', ({ expect }) => {
      const deck = makeDeck({ solo: 'item', initialized: false });
      const { deckUpdates } = computeActiveUpdates({ next: [], deck });
      expect(deckUpdates.solo).toBeUndefined();
    });

    test('clears active when next is empty and in deck mode', ({ expect }) => {
      const deck = makeDeck({ initialized: true, active: ['a', 'b'] });
      const { deckUpdates } = computeActiveUpdates({ next: [], deck });
      expect(deckUpdates.active).toEqual([]);
    });
  });
});
