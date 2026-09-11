//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as DeckSchema from './DeckSchema.ts';

const makeState = (partial: Partial<DeckSchema.StoredDeckState> = {}): DeckSchema.StoredDeckState => ({
  sidebarState: 'expanded',
  complementarySidebarState: 'collapsed',
  complementarySidebarPanel: undefined,
  activeDeck: 'deck',
  previousDeck: 'deck',
  decks: { deck: { ...DeckSchema.defaultDeck } },
  ...partial,
});

describe('getCompanionSelection', () => {
  test('desktop reports the pane open while a plank carries a companion, and closed once emptied', ({ expect }) => {
    const closed = makeState({ decks: { deck: { ...DeckSchema.defaultDeck, companionPlanks: [] } } });
    expect(DeckSchema.getCompanionSelection('desktop', closed, 'assistant-chat')).toEqual({
      open: false,
      variant: undefined,
    });

    const open = makeState({ decks: { deck: { ...DeckSchema.defaultDeck, companionPlanks: ['plank'] } } });
    expect(DeckSchema.getCompanionSelection('desktop', open, 'assistant-chat')).toEqual({
      open: true,
      variant: 'assistant-chat',
    });
  });

  test('a deck the reader has not decided on reports open, which is what starts the pane up', ({ expect }) => {
    expect(makeState().decks.deck.companionPlanks).toBeUndefined();
    expect(DeckSchema.getCompanionSelection('desktop', makeState(), 'assistant-chat')).toEqual({
      open: true,
      variant: 'assistant-chat',
    });
  });

  test('desktop leaves the variant absent so the pane falls back to its default companion', ({ expect }) => {
    const state = makeState({ decks: { deck: { ...DeckSchema.defaultDeck, companionPlanks: ['plank'] } } });
    expect(DeckSchema.getCompanionSelection('desktop', state, undefined)).toEqual({ open: true, variant: undefined });
  });

  test('mobile reads the drawer rather than the plank companion bookkeeping', ({ expect }) => {
    // The drawer never populates `companionPlanks`; an explicit empty list is the desktop's "closed".
    const state = makeState({
      complementarySidebarState: 'collapsed',
      complementarySidebarPanel: 'assistant-chat',
      decks: { deck: { ...DeckSchema.defaultDeck, companionPlanks: [] } },
    });
    expect(DeckSchema.getCompanionSelection('mobile', state, undefined)).toEqual({
      open: true,
      variant: 'assistant-chat',
    });
    expect(DeckSchema.getCompanionSelection('desktop', state, undefined)).toEqual({ open: false, variant: undefined });
  });

  test('mobile reports closed once the drawer closes, whatever tab it was left on', ({ expect }) => {
    const state = makeState({ complementarySidebarState: 'closed', complementarySidebarPanel: 'assistant-chat' });
    expect(DeckSchema.getCompanionSelection('mobile', state, undefined)).toEqual({ open: false, variant: undefined });
  });

  test('mobile reports closed when no tab is selected', ({ expect }) => {
    const state = makeState({ complementarySidebarState: 'expanded', complementarySidebarPanel: undefined });
    expect(DeckSchema.getCompanionSelection('mobile', state, undefined)).toEqual({ open: false, variant: undefined });
  });
});

describe('selectCompanion', () => {
  const companions = [{ id: 'plank/~comments' }, { id: 'plank/~assistant-chat' }, { id: 'plank/~help' }];

  test('honours a preference the plank offers', ({ expect }) => {
    expect(DeckSchema.selectCompanion(companions, 'assistant-chat')).toEqual({ id: 'plank/~assistant-chat' });
  });

  test('falls back to the first tab when the preferred one is not on this plank', ({ expect }) => {
    expect(DeckSchema.selectCompanion(companions, 'transcript')).toEqual({ id: 'plank/~comments' });
  });

  test('returns nothing when the plank has no companions', ({ expect }) => {
    expect(DeckSchema.selectCompanion([])).toBeUndefined();
  });
});
