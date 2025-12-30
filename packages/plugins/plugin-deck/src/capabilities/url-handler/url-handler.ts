//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createIntent } from '@dxos/app-framework';
import { scheduledEffect } from '@dxos/echo-signals/core';

import { DeckCapabilities, defaultDeck } from '../../types';

// TODO(wittjosiah): Cleanup the url handling. May justify introducing routing capabilities.
export default Capability.makeModule((context: Capability.PluginContext) =>
  Effect.gen(function* () {
    const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
    const state = context.getCapability(DeckCapabilities.MutableDeckState);

    const handleNavigation = async () => {
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
        await dispatch(createIntent(Common.LayoutAction.SwitchWorkspace, { part: 'workspace', subject: nextDeck }));
      }

      if (nextSolo && nextSolo !== state.deck.solo) {
        await dispatch(
          createIntent(Common.LayoutAction.SetLayoutMode, {
            part: 'mode',
            subject: nextSolo,
            options: { mode: 'solo' },
          }),
        );
      } else if (!nextSolo && state.deck.solo) {
        await dispatch(createIntent(Common.LayoutAction.SetLayoutMode, { part: 'mode', options: { mode: 'deck' } }));
      }
    };

    yield* Effect.tryPromise(() => handleNavigation());
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
