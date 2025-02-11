//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';
import { LocalStorageStore } from '@dxos/local-storage';
import { type SidebarState } from '@dxos/react-ui';

import { DeckCapabilities } from './capabilities';
import { DECK_PLUGIN } from '../meta';
import { getMode, type Deck, type DeckState } from '../types';

export default () => {
  const state = new LocalStorageStore<DeckState>(DECK_PLUGIN, {
    // TODO(Zan): Cap depth!
    modeHistory: [],
    sidebarState: 'expanded',
    complementarySidebarOpen: false,
    complementarySidebarPanel: undefined,
    dialogContent: null,
    dialogOpen: false,
    dialogBlockAlign: undefined,
    dialogType: undefined,
    popoverContent: null,
    popoverAnchorId: undefined,
    popoverOpen: false,
    toasts: [],
    currentUndoId: undefined,
    activeDeck: 'default',
    decks: {
      default: {
        active: [],
        inactive: [],
        fullscreen: false,
        solo: undefined,
        plankSizing: {},
      },
    },
    get deck() {
      const deck = this.decks[this.activeDeck];
      invariant(deck, `Deck not found: ${this.activeDeck}`);
      return deck;
    },
    scrollIntoView: undefined,
  });

  state
    .prop({ key: 'sidebarState', type: LocalStorageStore.enum<SidebarState>() })
    .prop({ key: 'complementarySidebarOpen', type: LocalStorageStore.bool() })
    .prop({ key: 'decks', type: LocalStorageStore.json<Record<string, Deck>>() })
    .prop({ key: 'activeDeck', type: LocalStorageStore.string() });

  const layout = create<Capabilities.Layout>({
    get mode() {
      return getMode(state.values.deck);
    },
    get dialogOpen() {
      return state.values.dialogOpen;
    },
    get sidebarState() {
      return state.values.sidebarState;
    },
    get active() {
      return state.values.deck.solo ? [state.values.deck.solo] : state.values.deck.active;
    },
    get inactive() {
      return state.values.deck.inactive;
    },
    get scrollIntoView() {
      return state.values.scrollIntoView;
    },
  });

  return [
    contributes(DeckCapabilities.DeckState, state.values, () => state.close()),
    contributes(Capabilities.Layout, layout),
  ];
};
