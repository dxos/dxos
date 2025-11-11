//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, createResolver } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { ExplorerAction, Graph } from '../types';

export default (context: PluginContext) =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ExplorerAction.CreateGraph,
      resolve: async ({ space, name, typename }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const graph = await Graph.make({ client, space, name, typename });
        return { data: { object: graph } };
      },
    }),
  );
