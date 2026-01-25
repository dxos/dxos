//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { invariant } from '@dxos/invariant';

import {
  DeckCapabilities,
  type DeckEphemeralStateProps,
  type DeckPluginState,
  type DeckState,
  type DeckStateProps,
} from '../types';

export type DeckStateHook = {
  /** Combined state value (reactive). Includes both persisted and ephemeral state. */
  state: DeckPluginState;
  /** The active deck, computed from decks[activeDeck]. */
  deck: DeckState;
  /** Update persisted state. */
  updateState: (fn: (current: DeckStateProps) => DeckStateProps) => void;
  /** Update ephemeral state. */
  updateEphemeral: (fn: (current: DeckEphemeralStateProps) => DeckEphemeralStateProps) => void;
};

/**
 * Hook to access the deck plugin state reactively.
 * Returns the combined state, the active deck, and update functions for each atom.
 */
export const useDeckState = (): DeckStateHook => {
  const registry = useCapability(Common.Capability.AtomRegistry);
  const stateAtom = useCapability(DeckCapabilities.State);
  const ephemeralAtom = useCapability(DeckCapabilities.EphemeralState);

  const persistedState = useAtomValue(stateAtom);
  const ephemeralState = useAtomValue(ephemeralAtom);

  // Compute deck from decks[activeDeck] to ensure it's always current.
  const deck = useMemo(() => {
    const d = persistedState.decks[persistedState.activeDeck];
    invariant(d, `Deck not found: ${persistedState.activeDeck}`);
    return d;
  }, [persistedState.decks, persistedState.activeDeck]);

  // Combine persisted and ephemeral state into a unified view.
  const state = useMemo(
    (): DeckPluginState => ({
      ...persistedState,
      ...ephemeralState,
    }),
    [persistedState, ephemeralState],
  );

  const updateState = useCallback(
    (fn: (current: DeckStateProps) => DeckStateProps) => {
      registry.set(stateAtom, fn(registry.get(stateAtom)));
    },
    [registry, stateAtom],
  );

  const updateEphemeral = useCallback(
    (fn: (current: DeckEphemeralStateProps) => DeckEphemeralStateProps) => {
      registry.set(ephemeralAtom, fn(registry.get(ephemeralAtom)));
    },
    [registry, ephemeralAtom],
  );

  return useMemo(
    () => ({
      state,
      deck,
      updateState,
      updateEphemeral,
    }),
    [state, deck, updateState, updateEphemeral],
  );
};
