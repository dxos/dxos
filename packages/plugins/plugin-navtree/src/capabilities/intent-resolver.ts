//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginsContext, Capabilities, createResolver, LayoutAction } from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { NavTreeCapabilities } from './capabilities';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is S.Schema.Type<typeof LayoutAction.Expose.fields.input> =>
        S.is(LayoutAction.Expose.fields.input)(data),
      resolve: async ({ subject }) => {
        const { graph } = context.requestCapability(Capabilities.AppGraph);
        const { getItem, setItem } = context.requestCapability(NavTreeCapabilities.State);

        try {
          const path = await graph.waitForPath({ target: subject }, { timeout: 1_000 });
          [...Array(path.length)].forEach((_, index) => {
            const subpath = path.slice(0, index);
            const value = getItem(subpath);
            if (!value.open) {
              setItem(subpath, 'open', true);
            }
          });
        } catch {
          log.warn('Path to node not found', { subject });
        }
      },
    }),
  );
