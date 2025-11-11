//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, createResolver } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { Masonry, MasonryAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MasonryAction.CreateMasonry,
      resolve: async ({ space, name, typename }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const masonry = await Masonry.make({
          client,
          space,
          name,
          typename,
        });
        return { data: { object: masonry } };
      },
    }),
  ]);
