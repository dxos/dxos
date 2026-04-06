//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { meta } from '../meta';
import { DeckCapabilities, type EphemeralDeckState, StoredDeckState, defaultDeck, getMode } from '../types';
import { sanitizePersistedState } from '../util';

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
  previousMode: {},
};

/** Default ephemeral state. */
const defaultDeckEphemeralState: EphemeralDeckState = {
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
    const registry = yield* Capability.get(Capabilities.AtomRegistry);

    // Persisted state using KVS store.
    const stateAtom = createKvsStore({
      key: `${meta.id}.state`,
      schema: StoredDeckState,
      defaultValue: () => ({ ...defaultDeckState }),
    });

    // Ephemeral state (not persisted, but kept alive to prevent GC resets).
    const ephemeralAtom = Atom.make<EphemeralDeckState>({ ...defaultDeckEphemeralState }).pipe(Atom.keepAlive);

    // Sanitize persisted state on startup (see sanitizePersistedState for details).
    const currentState = registry.get(stateAtom);
    const sanitizedState = sanitizePersistedState(currentState);
    if (sanitizedState !== currentState) {
      registry.set(stateAtom, sanitizedState);
    }

    // Create derived layout atom (read-only) from both state atoms.
    const layoutAtom = Atom.make((get) => {
      const state = get(stateAtom);
      const ephemeral = get(ephemeralAtom);
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      return {
        mode: getMode(deck),
        dialogOpen: ephemeral.dialogOpen,
        sidebarOpen: state.sidebarState === 'expanded',
        complementarySidebarOpen: state.complementarySidebarState === 'expanded',
        workspace: state.activeDeck,
        active: deck.solo ? [deck.solo] : deck.active,
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
