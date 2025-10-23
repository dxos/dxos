//
// Copyright 2023 DXOS.org
//

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { GraphPlugin } from '@dxos/plugin-graph';
import { SpacePlugin } from '@dxos/plugin-space';
import { ThemePlugin } from '@dxos/plugin-theme';
import { Config } from '@dxos/react-client';
import { Ref } from '@dxos/react-client/echo';
import { defaultTx } from '@dxos/react-ui-theme';

import { ThreadPlugin } from '../ThreadPlugin';
import { ChannelType, ThreadType } from '../types';

export const createThreadPlugins = async () => [
  ThemePlugin({ tx: defaultTx }),
  ClientPlugin({
    onClientInitialized: async ({ client }) => {
      await client.halo.createIdentity({ displayName: 'Test User' });
    },
    onSpacesReady: async ({ client }) => {
      await client.spaces.default.waitUntilReady();
      const thread = Obj.make(ThreadType, { messages: [] });
      client.spaces.default.db.add(Obj.make(ChannelType, { defaultThread: Ref.make(thread), threads: [] }));
    },
    config: new Config({
      runtime: {
        client: {
          edgeFeatures: {
            signaling: true,
          },
        },
        services: {
          edge: {
            url: 'https://edge.dxos.workers.dev/',
          },
          iceProviders: [
            {
              urls: 'https://edge.dxos.workers.dev/ice',
            },
          ],
        },
      },
    }),
  }),
  SpacePlugin(),
  IntentPlugin(),
  SettingsPlugin(),
  GraphPlugin(),
  ThreadPlugin(),
];
