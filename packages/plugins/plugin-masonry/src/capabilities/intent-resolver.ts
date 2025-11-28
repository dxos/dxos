//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, createResolver } from '@dxos/app-framework';
import { View } from '@dxos/schema';

import { Masonry, MasonryAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MasonryAction.CreateMasonry,
      resolve: async ({ space, name, typename }) => {
        const { view } = await View.makeFromSpace({ space, typename });
        const masonry = Masonry.make({ name, view });
        return { data: { object: masonry } };
      },
    }),
  ]);
