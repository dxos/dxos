//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, LayoutAction, type PluginsContext } from '@dxos/app-framework';
import { scheduledEffect } from '@dxos/echo-signals/core';

import { DeckCapabilities } from './capabilities';

// TODO(wittjosiah): Cleanup the url handling. May justify introducing routing capabilities.
export default async (context: PluginsContext) => {
  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher) ?? {};
  const state = context.requestCapability(DeckCapabilities.MutableDeckState);

  const handleNavigation = async () => {
    const pathname = window.location.pathname;
    if (pathname === '/reset') {
      state.activeDeck = 'default';
      state.decks = {
        default: {
          initialized: false,
          active: [],
          inactive: [],
          fullscreen: false,
          solo: undefined,
          plankSizing: {},
        },
      };
      window.location.pathname = '/';
      return;
    }

    const [_, nextDeck, nextSolo] = pathname.split('/');
    if (nextDeck && nextDeck !== state.activeDeck) {
      await dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: nextDeck }));
    }

    if (nextSolo && nextSolo !== state.deck.solo) {
      await dispatch(
        createIntent(LayoutAction.SetLayoutMode, { part: 'mode', subject: nextSolo, options: { mode: 'solo' } }),
      );
    } else if (!nextSolo && state.deck.solo) {
      await dispatch(createIntent(LayoutAction.SetLayoutMode, { part: 'mode', options: { mode: 'deck' } }));
    }
  };

  await handleNavigation();
  window.addEventListener('popstate', handleNavigation);

  const unsubscribe = scheduledEffect(
    () => ({ solo: state.deck.solo, activeDeck: state.activeDeck }),
    ({ solo, activeDeck }) => {
      const path = solo ? `/${activeDeck}/${solo}` : `/${activeDeck}`;
      // TODO(thure): In some browsers, this only preserves the most recent state change, even though this is not `history.replace`…
      history.pushState(null, '', `${path}${window.location.search}`);
    },
  );

  return contributes(Capabilities.Null, null, () => {
    window.removeEventListener('popstate', handleNavigation);
    unsubscribe();
  });
};
