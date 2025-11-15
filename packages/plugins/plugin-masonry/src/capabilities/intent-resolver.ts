//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, createResolver } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { View } from '@dxos/schema';

import { Masonry, MasonryAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MasonryAction.CreateMasonry,
      resolve: async ({ space, name, typename }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const { view } = await View.makeFromSpace({ client, space, typename });
        const masonry = Masonry.make({ name, view });
        return { data: { object: masonry } };
      },
    }),
  ]);
