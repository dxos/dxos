//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { meta } from '../../meta';
import {
  DeckCapabilities,
  type DeckEphemeralStateProps,
  type DeckPluginState,
  type DeckStateProps,
  DeckStateSchema,
  defaultDeck,
  getMode,
} from '../../types';

/** Default persisted state. */
export const defaultDeckState: DeckStateProps = {
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
export const defaultDeckEphemeralState: DeckEphemeralStateProps = {
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

/** Default combined state for testing. */
export const defaultDeckPluginState: DeckPluginState = {
  ...defaultDeckState,
  ...defaultDeckEphemeralState,
  deck: { ...defaultDeck },
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);

    // Persisted state using KVS store.
    const stateAtom = createKvsStore({
      key: `${meta.id}/state`,
      schema: DeckStateSchema,
      defaultValue: () => ({ ...defaultDeckState }),
    });

    // Ephemeral state (not persisted).
    const ephemeralAtom = Atom.make<DeckEphemeralStateProps>({ ...defaultDeckEphemeralState });

    // Don't allow fullscreen mode to be persisted to prevent getting stuck in it.
    const currentState = registry.get(stateAtom);
    const currentDeck = currentState.decks[currentState.activeDeck];
    if (currentDeck?.fullscreen) {
      registry.set(stateAtom, {
        ...currentState,
        decks: {
          ...currentState.decks,
          [currentState.activeDeck]: {
            ...currentDeck,
            fullscreen: false,
          },
        },
      });
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
      } satisfies Common.Capability.Layout;
    });

    return [
      Capability.contributes(DeckCapabilities.State, stateAtom),
      Capability.contributes(DeckCapabilities.EphemeralState, ephemeralAtom),
      Capability.contributes(Common.Capability.Layout, layoutAtom),
    ];
  }),
);
