//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { create } from '@dxos/live-object';
import { LocalStorageStore } from '@dxos/local-storage';

import { DeckCapabilities } from './capabilities';
import { DECK_ACTION, getMode, type DeckState, type PlankSizing } from '../types';

export default () => {
  const state = new LocalStorageStore<DeckState>(DECK_ACTION, {
    // TODO(Zan): Cap depth!
    modeHistory: [],
    sidebarOpen: true,
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
    fullscreen: false,
    solo: undefined,
    deck: [],
    closed: [],
    plankSizing: {},
    scrollIntoView: undefined,
  });

  state
    .prop({ key: 'sidebarOpen', type: LocalStorageStore.bool() })
    .prop({ key: 'complementarySidebarOpen', type: LocalStorageStore.bool() })
    .prop({ key: 'fullscreen', type: LocalStorageStore.bool() })
    .prop({ key: 'solo', type: LocalStorageStore.string({ allowUndefined: true }) })
    .prop({ key: 'deck', type: LocalStorageStore.json<string[]>() })
    .prop({ key: 'plankSizing', type: LocalStorageStore.json<PlankSizing>() });

  const layout = create<Capabilities.Layout>({
    get mode() {
      return getMode(state.values);
    },
    get dialogOpen() {
      return state.values.dialogOpen;
    },
    get active() {
      return state.values.solo ? [state.values.solo] : state.values.deck;
    },
    get inactive() {
      return state.values.closed;
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
