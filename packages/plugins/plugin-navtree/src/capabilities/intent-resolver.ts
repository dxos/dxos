//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginsContext, Capabilities, NavigationAction, createResolver } from '@dxos/app-framework';
import { log } from '@dxos/log';

import { NavTreeCapabilities } from './capabilities';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.IntentResolver,
    createResolver(NavigationAction.Expose, async ({ id }) => {
      const { graph } = context.requestCapability(Capabilities.AppGraph);
      const { getItem, setItem } = context.requestCapability(NavTreeCapabilities.State);

      try {
        const path = await graph.waitForPath({ target: id }, { timeout: 1_000 });
        [...Array(path.length)].forEach((_, index) => {
          const subpath = path.slice(0, index);
          const value = getItem(subpath);
          if (!value.open) {
            setItem(subpath, 'open', true);
          }
        });
      } catch {
        log.warn('Path to node not found', { id });
      }
    }),
  );
