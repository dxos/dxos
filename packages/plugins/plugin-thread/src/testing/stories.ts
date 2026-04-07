//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Plugin } from '@dxos/app-framework';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { Config } from '@dxos/react-client';
import { corePlugins } from '@dxos/plugin-testing';

import { ThreadPlugin } from '../ThreadPlugin';
import { Channel } from '#types';

export const createThreadPlugins = async (): Promise<Array<Plugin.Plugin>> => [
  ...corePlugins(),
  ClientPlugin({
    onClientInitialized: ({ client }) =>
      Effect.gen(function* () {
        yield* Effect.promise(() => client.halo.createIdentity({ displayName: 'Test User' }));
      }),
    onSpacesReady: ({ client }) =>
      Effect.gen(function* () {
        const space = client.spaces.get()[0];
        space.db.add(Channel.make());
      }),
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
  SpacePlugin({}),
  ThreadPlugin(),
];
