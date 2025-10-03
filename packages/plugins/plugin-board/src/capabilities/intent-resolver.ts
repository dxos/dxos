//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, createResolver } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { Board } from '../types';

export default (context: PluginContext) =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: Board.Create,
      resolve: async ({ space, name, typename }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const { view } = await Board.makeView({
          client,
          space,
          name,
          typename,
        });
        return { data: { object: view } };
      },
    }),
  );
