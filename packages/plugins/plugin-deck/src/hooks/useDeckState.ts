//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/react';
import { invariant } from '@dxos/invariant';

import { DeckCapabilities, type DeckPluginState, type DeckState } from '../types';

export type DeckStateHook = {
  /** Current state value (reactive). Uses the raw state from the atom. */
  state: DeckPluginState;
  /** The active deck, computed from decks[activeDeck]. */
  deck: DeckState;
  /** Update state using a function that receives current state and returns new state. */
  update: (fn: (current: DeckPluginState) => DeckPluginState) => void;
};

/**
 * Hook to access the deck plugin state reactively.
 * Returns the current state, the active deck, and an update function.
 *
 * NOTE: The `deck` is returned separately (not spread into state) to avoid creating
 * new object references on every state update, which would cause infinite re-render loops.
 */
export const useDeckState = (): DeckStateHook => {
  const stateStore = useCapability(DeckCapabilities.State);
  const state = useAtomValue(stateStore.atom);

  // Compute deck from decks[activeDeck] to ensure it's always current.
  // This is memoized based on the specific values it depends on, not the whole state.
  const deck = useMemo(() => {
    const d = state.decks[state.activeDeck];
    invariant(d, `Deck not found: ${state.activeDeck}`);
    return d;
  }, [state.decks, state.activeDeck]);

  return useMemo(
    () => ({
      state,
      deck,
      update: stateStore.update,
    }),
    [state, deck, stateStore.update],
  );
};
