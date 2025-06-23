//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Schema } from 'effect';
import defaulstDeep from 'lodash.defaultsdeep';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { type ConfigProto } from '@dxos/config';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MapPlugin } from '@dxos/plugin-map';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { type IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';
import { Config } from '@dxos/react-client';
import { DataTypes } from '@dxos/schema';

type TestPluginsOptions = { config?: ConfigProto; types?: Schema.Schema.AnyNoContext[]; indexConfig?: IndexConfig };

export const testPlugins = ({ config, types = DataTypes, indexConfig }: TestPluginsOptions = {}) => [
  ClientPlugin({
    config: new Config(
      defaulstDeep({}, config, {
        runtime: {
          services: {
            edge: {
              url: 'http://edge-main.dxos.workers.dev',
            },
          },
        },
      }),
    ),
    types,
    onClientInitialized: async (_, client) => {
      if (!client.halo.identity.get()) {
        await client.halo.createIdentity();
      }

      if (indexConfig) {
        // TODO(burdon): Rename services.services?
        await client.services.services.QueryService!.setConfig(indexConfig);
      }
    },
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
