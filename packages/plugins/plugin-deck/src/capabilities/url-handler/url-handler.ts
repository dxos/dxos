//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';

import { DeckCapabilities, type DeckStateProps, defaultDeck } from '../../types';

// TODO(wittjosiah): Cleanup the url handling. May justify introducing routing capabilities.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokeSync } = yield* Capability.get(Common.Capability.OperationInvoker);
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);
    const stateAtom = yield* Capability.get(DeckCapabilities.State);

    // Helper to get state.
    const getState = () => registry.get(stateAtom);

    // Helper to get computed deck from state.
    const getDeck = () => {
      const state = getState();
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      return deck;
    };

    // Helper to update state.
    const updateState = (fn: (current: DeckStateProps) => DeckStateProps) => {
      registry.set(stateAtom, fn(getState()));
    };

    const handleNavigation = () => {
      const pathname = window.location.pathname;
      const state = getState();
      if (pathname === '/reset') {
        updateState((s) => ({
          ...s,
          activeDeck: 'default',
          decks: {
            default: { ...defaultDeck },
          },
        }));
        window.location.pathname = '/';
        return;
      }

      const [_, nextDeck, nextSolo] = pathname.split('/');
      if (nextDeck && nextDeck !== state.activeDeck) {
        invokeSync(Common.LayoutOperation.SwitchWorkspace, { subject: nextDeck });
      }

      const deck = getDeck();
      if (nextSolo && nextSolo !== deck.solo) {
        invokeSync(Common.LayoutOperation.SetLayoutMode, { subject: nextSolo, mode: 'solo' });
      } else if (!nextSolo && deck.solo) {
        invokeSync(Common.LayoutOperation.SetLayoutMode, { mode: 'deck' });
      }
    };

    yield* Effect.sync(() => handleNavigation());
    window.addEventListener('popstate', handleNavigation);

    // Subscribe to state changes to update the URL.
    let lastSolo: string | undefined;
    let lastActiveDeck: string | undefined;
    const unsubscribe = registry.subscribe(stateAtom, () => {
      const state = getState();
      const deck = getDeck();
      const solo = deck.solo;
      const activeDeck = state.activeDeck;

      // Only update URL if relevant state changed.
      if (solo !== lastSolo || activeDeck !== lastActiveDeck) {
        lastSolo = solo;
        lastActiveDeck = activeDeck;

        const path = solo ? `/${activeDeck}/${solo}` : `/${activeDeck}`;
        if (window.location.pathname !== path) {
          // TODO(thure): In some browsers, this only preserves the most recent state change, even though this is not `history.replace`…
          history.pushState(null, '', `${path}${window.location.search}`);
        }
      }
    });

    return Capability.contributes(Common.Capability.Null, null, () =>
      Effect.sync(() => {
        window.removeEventListener('popstate', handleNavigation);
        unsubscribe();
      }),
    );
  }),
);
