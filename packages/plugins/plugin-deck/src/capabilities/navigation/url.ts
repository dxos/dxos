//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  contributes,
  createIntent,
  LayoutAction,
  type LayoutParts,
  type PluginsContext,
} from '@dxos/app-framework';
import { scheduledEffect } from '@dxos/echo-signals/core';
import { AttentionCapabilities } from '@dxos/plugin-attention';

import { setLocation as naturalSetLocation } from './set-location';
import { NAV_ID } from '../../components';
import { mergeLayoutParts, removePart, soloPartToUri, uriToSoloPart } from '../../layout';

export default async (context: PluginsContext) => {
  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher) ?? {};
  const location = context.requestCapability(Capabilities.MutableLocation);
  const layout = context.requestCapability(Capabilities.MutableLayout);
  const attention = context.requestCapability(AttentionCapabilities.Attention);

  const handleNavigation = async () => {
    const setLocation = (next: LayoutParts) => naturalSetLocation({ next, layout, location, attention });

    const pathname = window.location.pathname;
    if (pathname === '/reset') {
      setLocation({ sidebar: [{ id: NAV_ID }] });
      location.closed = [];
      layout.layoutMode = 'solo';
      window.location.pathname = '/';
      return;
    }

    const startingLayout = removePart(location.active, 'solo');
    const layoutFromUri = uriToSoloPart(pathname);
    if (!layoutFromUri) {
      const toAttend = setLocation(startingLayout);
      layout.layoutMode = 'deck';
      await dispatch?.(createIntent(LayoutAction.ScrollIntoView, { id: toAttend }));
      return;
    }

    const toAttend = setLocation(mergeLayoutParts(layoutFromUri, startingLayout));
    layout.layoutMode = 'solo';
    await dispatch?.(createIntent(LayoutAction.ScrollIntoView, { id: toAttend }));
  };

  await handleNavigation();
  window.addEventListener('popstate', handleNavigation);

  const unsubscribe = scheduledEffect(
    () => ({ selectedPath: soloPartToUri(location.active) }),
    ({ selectedPath }) => {
      // TODO(thure): In some browsers, this only preserves the most recent state change, even though this is not `history.replace`…
      history.pushState(null, '', `/${selectedPath}${window.location.search}`);
    },
  );

  return contributes(Capabilities.Null, null, () => {
    window.removeEventListener('popstate', handleNavigation);
    unsubscribe();
  });
};
