//
// Copyright 2025 DXOS.org
//

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { scheduledEffect } from '@dxos/echo-signals/core';

import { defaultDeck } from '../types';

import { DeckCapabilities } from './capabilities';

// TODO(wittjosiah): Cleanup the url handling. May justify introducing routing capabilities.
export default async (context: PluginContext) => {
  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
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
    } else if (pathname.startsWith('/redirect')) {
      // Allow other plugins to handle the redirect.
      // TODO(wittjosiah): This sort of this could motivate introducing a router.
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
      if (window.location.pathname !== path) {
        // TODO(thure): In some browsers, this only preserves the most recent state change, even though this is not `history.replace`…
        history.pushState(null, '', `${path}${window.location.search}`);
      }
    },
  );

  return contributes(Capabilities.Null, null, () => {
    window.removeEventListener('popstate', handleNavigation);
    unsubscribe();
  });
};
