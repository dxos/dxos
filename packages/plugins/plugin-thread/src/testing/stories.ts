//
// Copyright 2023 DXOS.org
//

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { ClientPlugin } from '@dxos/plugin-client';
import { GraphPlugin } from '@dxos/plugin-graph';
import { SpacePlugin } from '@dxos/plugin-space';
import { CollectionType } from '@dxos/plugin-space/types';
import { Config } from '@dxos/react-client';
import { live, makeRef } from '@dxos/react-client/echo';

import { ThreadPlugin } from '../ThreadPlugin';

export const createThreadPlugins = async () => [
  ClientPlugin({
    onClientInitialized: async (_, client) => {
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      await space.waitUntilReady();
      space.properties[CollectionType.typename] = makeRef(live(CollectionType, { objects: [], views: {} }));
    },
    config: new Config({
      runtime: {
        client: { edgeFeatures: { signaling: true } },
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
