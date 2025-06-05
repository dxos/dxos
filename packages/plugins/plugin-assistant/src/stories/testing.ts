//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { TYPES } from '@dxos/assistant';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MapPlugin } from '@dxos/plugin-map';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { Config } from '@dxos/react-client';

export const testPlugins = [
  ClientPlugin({
    config: new Config({
      runtime: {
        client: {
          storage: {
            persistent: true,
          },
          enableVectorIndexing: true,
        },
        services: {
          edge: {
            url: 'http://edge-main.dxos.workers.dev',
          },
        },
      },
    }),
    onClientInitialized: async (_, client) => {
      if (!client.halo.identity.get()) {
        await client.halo.createIdentity();
      }
    },
    types: [...TYPES],
  }),
  SpacePlugin(),
  SettingsPlugin(),
  IntentPlugin(),

  // Artifacts.
  ChessPlugin(),
  InboxPlugin(),
  MapPlugin(),
  TablePlugin(),
  PreviewPlugin(),
];
