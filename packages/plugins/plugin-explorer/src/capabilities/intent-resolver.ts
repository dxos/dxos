//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, createResolver } from '@dxos/app-framework';
import { View } from '@dxos/schema';

import { ExplorerAction, Graph } from '../types';

export default (context: PluginContext) =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ExplorerAction.CreateGraph,
      resolve: async ({ space, name, typename }) => {
        const { view } = await View.makeFromSpace({ space, typename });
        const graph = Graph.make({ name, view });
        return { data: { object: graph } };
      },
    }),
  );
