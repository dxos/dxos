//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { OperationPlugin, type Plugin } from '@dxos/app-framework';
import { ClientPlugin } from '@dxos/plugin-client';
import { GraphPlugin } from '@dxos/plugin-graph';
import { SettingsPlugin } from '@dxos/plugin-settings';
import { SpacePlugin } from '@dxos/plugin-space';
import { ThemePlugin } from '@dxos/plugin-theme';
import { create } from '@dxos/protocols/buf';
import {
  ConfigSchema,
  RuntimeSchema,
  Runtime_ClientSchema,
  Runtime_Client_EdgeFeaturesSchema,
  Runtime_ServicesSchema,
  Runtime_Services_EdgeSchema,
  Runtime_Services_IceProviderSchema,
} from '@dxos/protocols/buf/dxos/config_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Config } from '@dxos/react-client';
import { defaultTx } from '@dxos/ui-theme';

import { ThreadPlugin } from '../ThreadPlugin';
import { Channel } from '../types';

export const createThreadPlugins = async (): Promise<Array<Plugin.Plugin>> => [
  ThemePlugin({ tx: defaultTx }),
  ClientPlugin({
    onClientInitialized: ({ client }) =>
      Effect.gen(function* () {
        yield* Effect.promise(() => client.halo.createIdentity(create(ProfileDocumentSchema, { displayName: 'Test User' })));
      }),
    onSpacesReady: ({ client }) =>
      Effect.gen(function* () {
        yield* Effect.promise(() => client.spaces.default.waitUntilReady());
        client.spaces.default.db.add(Channel.make());
      }),
    config: new Config(
      create(ConfigSchema, {
        runtime: create(RuntimeSchema, {
          client: create(Runtime_ClientSchema, {
            edgeFeatures: create(Runtime_Client_EdgeFeaturesSchema, { signaling: true }),
          }),
          services: create(Runtime_ServicesSchema, {
            edge: create(Runtime_Services_EdgeSchema, { url: 'https://edge.dxos.workers.dev/' }),
            iceProviders: [
              create(Runtime_Services_IceProviderSchema, {
                urls: 'https://edge.dxos.workers.dev/ice',
              }),
            ],
          }),
        }),
      }),
    ),
  }),
  SpacePlugin({}),
  OperationPlugin(),
  SettingsPlugin(),
  GraphPlugin(),
  ThreadPlugin(),
];
