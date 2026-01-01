//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { scheduledEffect } from '@dxos/echo-signals/core';

import { DeckCapabilities, defaultDeck } from '../../types';

// TODO(wittjosiah): Cleanup the url handling. May justify introducing routing capabilities.
export default Capability.makeModule((context: Capability.PluginContext) =>
  Effect.gen(function* () {
    const { invokeSync } = context.getCapability(Common.Capability.OperationInvoker);
    const state = context.getCapability(DeckCapabilities.MutableDeckState);

    const handleNavigation = () => {
      const pathname = window.location.pathname;
      if (pathname === '/reset') {
        state.activeDeck = 'default';
        state.decks = {
          default: { ...defaultDeck },
        };
        window.location.pathname = '/';
        return;
      }

      const [_, nextDeck, nextSolo] = pathname.split('/');
      if (nextDeck && nextDeck !== state.activeDeck) {
        invokeSync(Common.LayoutOperation.SwitchWorkspace, { subject: nextDeck });
      }

      if (nextSolo && nextSolo !== state.deck.solo) {
        invokeSync(Common.LayoutOperation.SetLayoutMode, { subject: nextSolo, mode: 'solo' });
      } else if (!nextSolo && state.deck.solo) {
        invokeSync(Common.LayoutOperation.SetLayoutMode, { mode: 'deck' });
      }
    };

    yield* Effect.sync(() => handleNavigation());
    window.addEventListener('popstate', handleNavigation);

    const unsubscribe = scheduledEffect(
      () => ({ solo: state.deck.solo, activeDeck: state.activeDeck }),
      ({ solo, activeDeck }) => {
        const path = solo ? `/${activeDeck}/${solo}` : `/${activeDeck}`;
        if (window.location.pathname !== path) {
          // TODO(thure): In some browsers, this only preserves the most recent state change, even though this is not `history.replace`…
          history.pushState(null, '', `${path}${window.location.search}`);
        }
      },
    );

    return Capability.contributes(Common.Capability.Null, null, () =>
      Effect.sync(() => {
        window.removeEventListener('popstate', handleNavigation);
        unsubscribe();
      }),
    );
  }),
);
