//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useMemo } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useCapability } from '@dxos/app-framework/ui';
import { invariant } from '@dxos/invariant';

import { DeckCapabilities } from '#types';

import * as DeckSchema from '../types/DeckSchema';

export type DeckStateHook = {
  /** Combined state value (reactive). Includes both persisted and ephemeral state. */
  state: DeckSchema.DeckPluginState;
  /** The active deck, computed from decks[activeDeck]. */
  deck: DeckSchema.DeckState;
  /** Update persisted state. */
  updateState: (fn: (current: DeckSchema.StoredDeckState) => DeckSchema.StoredDeckState) => void;
  /** Update ephemeral state. */
  updateEphemeral: (fn: (current: DeckSchema.EphemeralDeckState) => DeckSchema.EphemeralDeckState) => void;
};

/**
 * Hook to access the deck plugin state reactively.
 * Returns the combined state, the active deck, and update functions for each atom.
 */
export const useDeckState = (): DeckStateHook => {
  const registry = useCapability(Capabilities.AtomRegistry);
  const stateAtom = useCapability(DeckCapabilities.State);
  const ephemeralAtom = useCapability(DeckCapabilities.EphemeralState);
  const persistedState = useAtomValue(stateAtom);
  const ephemeralState = useAtomValue(ephemeralAtom);

  // Compute deck from decks[activeDeck] to ensure it's always current.
  const deck = useMemo(() => {
    const deck = persistedState.decks[persistedState.activeDeck];
    invariant(deck, `Deck not found: ${persistedState.activeDeck}`);
    return deck;
  }, [persistedState.decks, persistedState.activeDeck]);

  // Combine persisted and ephemeral state into a unified view.
  const state = useMemo(
    (): DeckSchema.DeckPluginState => ({
      ...persistedState,
      ...ephemeralState,
    }),
    [persistedState, ephemeralState],
  );

  const updateState = useCallback(
    (fn: (current: DeckSchema.StoredDeckState) => DeckSchema.StoredDeckState) => {
      registry.set(stateAtom, fn(registry.get(stateAtom)));
    },
    [registry, stateAtom],
  );

  const updateEphemeral = useCallback(
    (fn: (current: DeckSchema.EphemeralDeckState) => DeckSchema.EphemeralDeckState) => {
      registry.set(ephemeralAtom, fn(registry.get(ephemeralAtom)));
    },
    [registry, ephemeralAtom],
  );

  return useMemo(() => ({ state, deck, updateState, updateEphemeral }), [state, deck, updateState, updateEphemeral]);
};
