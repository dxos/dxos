//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';
import { LocalStorageStore } from '@dxos/local-storage';
import { type SidebarState } from '@dxos/react-ui';

import { DeckCapabilities } from './capabilities';
import { DECK_PLUGIN } from '../meta';
import { getMode, type DeckPluginState, defaultDeck, type DeckState } from '../types';

const boolean = /true|false/;

// TODO(thure, 18 Feb 2025): Remove after the next release.

const migrateSidebarStateDefaults = {
  [`${DECK_PLUGIN}/complementary-sidebar-state`]: 'expanded',
  [`${DECK_PLUGIN}/sidebar-state`]: 'collapsed',
};

const migrateSidebarState = () => {
  Object.entries(migrateSidebarStateDefaults).forEach(([key, defaultValue]) => {
    if (boolean.test(localStorage.getItem(key) ?? 'never')) {
      localStorage.setItem(key, defaultValue);
    }
  });
};

const DeckStateFactory = () => {
  migrateSidebarState();

  const state = new LocalStorageStore<DeckPluginState>(DECK_PLUGIN, {
    sidebarState: 'expanded',
    complementarySidebarState: 'collapsed',
    complementarySidebarPanel: undefined,
    dialogContent: null,
    dialogOpen: false,
    dialogBlockAlign: undefined,
    dialogType: undefined,
    popoverContent: null,
    popoverAnchor: undefined,
    popoverAnchorId: undefined,
    popoverOpen: false,
    toasts: [],
    currentUndoId: undefined,
    activeDeck: 'default',
    previousDeck: 'default',
    decks: {
      default: { ...defaultDeck },
    },
    get deck() {
      const deck = this.decks[this.activeDeck];
      invariant(deck, `Deck not found: ${this.activeDeck}`);
      return deck;
    },
    previousMode: {},
    scrollIntoView: undefined,
  });

  state
    .prop({ key: 'sidebarState', type: LocalStorageStore.enum<SidebarState>() })
    .prop({ key: 'complementarySidebarState', type: LocalStorageStore.enum<SidebarState>() })
    .prop({ key: 'complementarySidebarPanel', type: LocalStorageStore.string({ allowUndefined: true }) })
    .prop({ key: 'decks', type: LocalStorageStore.json<Record<string, DeckState>>() })
    .prop({ key: 'activeDeck', type: LocalStorageStore.string() })
    .prop({ key: 'previousDeck', type: LocalStorageStore.string() });

  const layout = live<Capabilities.Layout>({
    get mode() {
      return getMode(state.values.deck);
    },
    get dialogOpen() {
      return state.values.dialogOpen;
    },
    get sidebarOpen() {
      return state.values.sidebarState === 'expanded';
    },
    get complementarySidebarOpen() {
      return state.values.complementarySidebarState === 'expanded';
    },
    get workspace() {
      return state.values.activeDeck;
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

export default DeckStateFactory;
