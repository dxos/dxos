//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capabilities, LayoutAction, type PluginContext, contributes, createResolver } from '@dxos/app-framework';
import { log } from '@dxos/log';

import { NavTreeCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.Expose.fields.input> =>
        Schema.is(LayoutAction.Expose.fields.input)(data),
      resolve: async ({ subject }) => {
        const { graph } = context.getCapability(Capabilities.AppGraph);
        const { getItem, setItem } = context.getCapability(NavTreeCapabilities.State);

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
          log('Path to node not found', { subject });
        }
      },
    }),
  );
