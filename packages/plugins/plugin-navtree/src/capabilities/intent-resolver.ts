//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability, Common, createResolver } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { Graph } from '@dxos/plugin-graph';

import { NavTreeCapabilities } from './capabilities';

export default Capability.makeModule((context) =>
  Capability.contributes(
    Common.Capability.IntentResolver,
    createResolver({
      intent: Common.LayoutAction.UpdateLayout,
      filter: (data): data is Schema.Schema.Type<typeof Common.LayoutAction.Expose.fields.input> =>
        Schema.is(Common.LayoutAction.Expose.fields.input)(data),
      resolve: async ({ subject }) => {
        const { graph } = context.getCapability(Common.Capability.AppGraph);
        const { getItem, setItem } = context.getCapability(NavTreeCapabilities.State);

        try {
          const path = await Graph.waitForPath(graph, { target: subject }, { timeout: 1_000 });
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
  ),
);
