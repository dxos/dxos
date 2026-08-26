//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as DeckSchema from './DeckSchema';

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
  test('desktop reports the pane open only while a plank carries a companion', ({ expect }) => {
    const closed = makeState();
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

  test('desktop leaves the variant absent so the pane falls back to the first companion', ({ expect }) => {
    const state = makeState({ decks: { deck: { ...DeckSchema.defaultDeck, companionPlanks: ['plank'] } } });
    expect(DeckSchema.getCompanionSelection('desktop', state, undefined)).toEqual({ open: true, variant: undefined });
  });

  test('mobile reads the drawer rather than the plank companion bookkeeping', ({ expect }) => {
    // The drawer never populates `companionPlanks`, so the desktop signal is absent by construction.
    const state = makeState({ complementarySidebarState: 'collapsed', complementarySidebarPanel: 'assistant-chat' });
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
