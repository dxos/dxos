//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { meta } from '#meta';
import { DeckCapabilities, type EphemeralDeckState, StoredDeckState, defaultDeck } from '#types';

import { migratePersistedState } from '../util';

const STATE_KEY = `${meta.profile.key}.state`;

/** Default persisted state. */
const defaultDeckState: StoredDeckState = {
  sidebarState: 'expanded',
  complementarySidebarState: 'collapsed',
  complementarySidebarPanel: undefined,
  activeDeck: 'default',
  previousDeck: 'default',
  decks: {
    default: { ...defaultDeck },
  },
};

/** Default ephemeral state. */
const defaultDeckEphemeralState: EphemeralDeckState = {
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
  Effect.fnUntraced(function* () {
    // Migrate a legacy (pre single-mode-deck) blob before the KVS atom's schema decode would
    // otherwise silently strip its removed fields (see migratePersistedState for details).
    migratePersistedState(STATE_KEY);

    // Persisted state using KVS store.
    const stateAtom = createKvsStore({
      key: STATE_KEY,
      schema: StoredDeckState,
      defaultValue: () => ({ ...defaultDeckState }),
    });

    // Ephemeral state (not persisted, but kept alive to prevent GC resets).
    const ephemeralAtom = Atom.make<EphemeralDeckState>({ ...defaultDeckEphemeralState }).pipe(Atom.keepAlive);

    // Create derived layout atom (read-only) from both state atoms.
    const layoutAtom = Atom.make((get) => {
      const state = get(stateAtom);
      const ephemeral = get(ephemeralAtom);
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      return {
        variant: 'deck',
        layoutMode: deck.active.length > 1 ? 'multi' : 'solo',
        fullscreen: !!ephemeral.fullscreen,
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
      Capability.contributes(DeckCapabilities.State, stateAtom),
      Capability.contributes(DeckCapabilities.EphemeralState, ephemeralAtom),
      Capability.contributes(AppCapabilities.Layout, layoutAtom),
    ];
  }),
);
