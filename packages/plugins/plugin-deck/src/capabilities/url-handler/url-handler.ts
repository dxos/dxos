//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, NOT_FOUND_PATH, fromUrlPath, getWorkspaceFromPath, toUrlPath } from '@dxos/app-toolkit';
import { invariant } from '@dxos/invariant';
import { Node } from '@dxos/plugin-graph';

import { DeckCapabilities, type DeckStateProps, defaultDeck } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
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

    const handleNavigation = async () => {
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

      const qualifiedId = fromUrlPath(pathname);
      const workspace = getWorkspaceFromPath(qualifiedId);
      if (workspace !== Node.RootId && workspace !== state.activeDeck) {
        await invokePromise(LayoutOperation.SwitchWorkspace, { subject: workspace });
      }

      const deck = getDeck();
      const activeId = qualifiedId !== workspace ? qualifiedId : undefined;
      if (activeId) {
        // Ensure the object referenced by the URL is open in the deck.
        // Open validates the target and may redirect to 404, returning the resolved IDs.
        const { data: resolvedIds } = await invokePromise(LayoutOperation.Open, { subject: [activeId] });
        // If not already in solo mode, switch to solo for the resolved target.
        if (!deck.solo) {
          await invokePromise(LayoutOperation.SetLayoutMode, { subject: resolvedIds?.[0] ?? activeId, mode: 'solo' });
        }
      } else if (deck.solo) {
        // Stay in solo mode; redirect URL to reflect the current solo item.
        // Do not switch to deck mode here — only explicit user action should change layout mode.
        const path = toUrlPath(deck.solo);
        if (window.location.pathname !== path) {
          history.replaceState(null, '', `${path}${window.location.search}`);
        }
      }
    };

    yield* Effect.promise(() => handleNavigation());
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

        const path = solo && solo !== NOT_FOUND_PATH ? toUrlPath(solo) : toUrlPath(activeDeck);
        if (window.location.pathname !== path) {
          // TODO(thure): In some browsers, this only preserves the most recent state change, even though this is not `history.replace`…
          history.pushState(null, '', `${path}${window.location.search}`);
        }
      }
    });

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        window.removeEventListener('popstate', handleNavigation);
        unsubscribe();
      }),
    );
  }),
);
