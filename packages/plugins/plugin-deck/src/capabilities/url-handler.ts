//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, LayoutAction, type PluginsContext } from '@dxos/app-framework';
import { scheduledEffect } from '@dxos/echo-signals/core';

import { DeckCapabilities } from './capabilities';

const uriToSoloPart = (uri: string): string | undefined => {
  // Now after the domain part, there will be a single ID with an optional path
  const parts = uri.split('/');
  const slug = parts[parts.length - 1]; // Take the last part of the URI

  return slug.length > 0 ? slug : undefined;
};

export default async (context: PluginsContext) => {
  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher) ?? {};
  const layout = context.requestCapability(DeckCapabilities.MutableDeckState);

  const handleNavigation = async () => {
    const pathname = window.location.pathname;
    if (pathname === '/reset') {
      layout.fullscreen = false;
      layout.solo = undefined;
      layout.deck = [];
      layout.closed = [];
      window.location.pathname = '/';
      return;
    }

    const solo = uriToSoloPart(pathname);
    if (!solo) {
      layout.solo = undefined;
      if (layout.deck[0]) {
        await dispatch?.(createIntent(LayoutAction.ScrollIntoView, { part: 'current', subject: layout.deck[0] }));
      }
      return;
    }

    layout.solo = solo;
    await dispatch?.(createIntent(LayoutAction.ScrollIntoView, { part: 'current', subject: solo }));
  };

  await handleNavigation();
  window.addEventListener('popstate', handleNavigation);

  const unsubscribe = scheduledEffect(
    () => ({ solo: layout.solo }),
    ({ solo }) => {
      const path = solo ? `/${solo}` : '';
      // TODO(thure): In some browsers, this only preserves the most recent state change, even though this is not `history.replace`…
      history.pushState(null, '', `${path}${window.location.search}`);
    },
  );

  return contributes(Capabilities.Null, null, () => {
    window.removeEventListener('popstate', handleNavigation);
    unsubscribe();
  });
};
