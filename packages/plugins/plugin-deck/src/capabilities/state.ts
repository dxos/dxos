//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { createKvsStore } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { meta } from '#meta';
import { DeckCapabilities, DeckSchema } from '#types';

import { migratePersistedState } from '../util';

const STATE_KEY = `${meta.profile.key}.state`;

/** Default persisted state. */
const defaultDeckState: DeckSchema.StoredDeckState = {
  sidebarState: 'expanded',
  complementarySidebarState: 'collapsed',
  complementarySidebarPanel: undefined,
  activeDeck: DeckSchema.DEFAULT_DECK_ID,
  previousDeck: DeckSchema.DEFAULT_DECK_ID,
  decks: {
    [DeckSchema.DEFAULT_DECK_ID]: { ...DeckSchema.defaultDeck },
  },
};

/** Default ephemeral state. */
const defaultDeckEphemeralState: DeckSchema.EphemeralDeckState = {
  fullscreen: undefined,
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
  scrollIntoView: undefined,
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ platform = 'desktop' }: DeckCapabilities.DeckPluginOptions = {}) {
    // Migrate a legacy (pre single-mode-deck) blob before the KVS atom's schema decode would
    // otherwise silently strip its removed fields (see migratePersistedState for details).
    migratePersistedState(STATE_KEY);

    // Persisted state using KVS store.
    const stateAtom = createKvsStore({
      key: STATE_KEY,
      schema: DeckSchema.StoredDeckState,
      defaultValue: () => ({ ...defaultDeckState }),
    });

    // Ephemeral state (not persisted, but kept alive to prevent GC resets).
    const ephemeralAtom = Atom.make<DeckSchema.EphemeralDeckState>({ ...defaultDeckEphemeralState }).pipe(
      Atom.keepAlive,
    );

    // Create derived layout atom (read-only) from both state atoms.
    const layoutAtom = Atom.make((get) => {
      const state = get(stateAtom);
      const ephemeral = get(ephemeralAtom);
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      return {
        mode: platform === 'mobile' ? 'mobile' : DeckSchema.getMode(deck, !!ephemeral.fullscreen),
        dialogOpen: ephemeral.dialogOpen,
        sidebarOpen: state.sidebarState === 'expanded',
        complementarySidebarOpen: state.complementarySidebarState === 'expanded',
        workspace: state.activeDeck,
        active: deck.active,
        inactive: deck.inactive,
        scrollIntoView: ephemeral.scrollIntoView,
      } satisfies AppCapabilities.Layout;
    }).pipe(Atom.keepAlive);

    return [
      Capability.contribute(DeckCapabilities.State, stateAtom),
      Capability.contribute(DeckCapabilities.EphemeralState, ephemeralAtom),
      Capability.contribute(AppCapabilities.Layout, layoutAtom),
      Capability.contribute(DeckCapabilities.Platform, platform),
    ];
  }),
);
