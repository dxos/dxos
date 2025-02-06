//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

import { DeckCapabilities } from './capabilities';
import { DECK_ACTION, type Layout, type PlankSizing } from '../types';

export default () => {
  const layout = new LocalStorageStore<Layout>(DECK_ACTION, {
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

  layout
    .prop({ key: 'sidebarOpen', type: LocalStorageStore.bool() })
    .prop({ key: 'complementarySidebarOpen', type: LocalStorageStore.bool() })
    .prop({ key: 'fullscreen', type: LocalStorageStore.bool() })
    .prop({ key: 'solo', type: LocalStorageStore.string({ allowUndefined: true }) })
    .prop({ key: 'deck', type: LocalStorageStore.json<string[]>() })
    .prop({ key: 'plankSizing', type: LocalStorageStore.json<PlankSizing>() });

  return contributes(DeckCapabilities.DeckState, layout.values, () => layout.close());
};
