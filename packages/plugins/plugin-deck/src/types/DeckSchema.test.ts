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

  test('desktop leaves the variant absent so the pane falls back to its default companion', ({ expect }) => {
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

describe('selectCompanion', () => {
  const companions = [{ id: 'plank/~comments' }, { id: 'plank/~assistant-chat' }, { id: 'plank/~help' }];

  test('honours a preference the plank offers', ({ expect }) => {
    expect(DeckSchema.selectCompanion(companions, 'assistant-chat')).toEqual({ id: 'plank/~assistant-chat' });
  });

  test('falls back to help when there is no preference', ({ expect }) => {
    expect(DeckSchema.selectCompanion(companions)).toEqual({ id: 'plank/~help' });
  });

  test('falls back to help when the preferred tab is not on this plank', ({ expect }) => {
    expect(DeckSchema.selectCompanion(companions, 'transcript')).toEqual({ id: 'plank/~help' });
  });

  test('falls back to the first tab when the plank has no help companion', ({ expect }) => {
    expect(DeckSchema.selectCompanion([{ id: 'plank/~comments' }], 'transcript')).toEqual({ id: 'plank/~comments' });
  });

  test('returns nothing when the plank has no companions', ({ expect }) => {
    expect(DeckSchema.selectCompanion([])).toBeUndefined();
  });
});

describe('shouldOpenCompanionByDefault', () => {
  const withHelp = [{ id: 'plank/~comments' }, { id: 'plank/~help' }];

  test('opens on a plank that has help and a pane the user has not closed', ({ expect }) => {
    expect(
      DeckSchema.shouldOpenCompanionByDefault({
        companions: withHelp,
        companionPlanks: [],
        flatten: true,
        plankId: 'plank',
      }),
    ).toBe(true);
  });

  test('does nothing when the pane is already open', ({ expect }) => {
    expect(
      DeckSchema.shouldOpenCompanionByDefault({
        companions: withHelp,
        companionPlanks: ['plank'],
        flatten: true,
        plankId: 'plank',
      }),
    ).toBe(false);
  });

  test('leaves a plank whose companions do not include help alone', ({ expect }) => {
    expect(
      DeckSchema.shouldOpenCompanionByDefault({
        companions: [{ id: 'plank/~assistant-chat' }],
        companionPlanks: [],
        flatten: true,
        plankId: 'plank',
      }),
    ).toBe(false);
  });

  test('leaves a plank with no companions alone', ({ expect }) => {
    expect(
      DeckSchema.shouldOpenCompanionByDefault({
        companions: [],
        companionPlanks: [],
        flatten: true,
        plankId: 'plank',
      }),
    ).toBe(false);
  });
});
