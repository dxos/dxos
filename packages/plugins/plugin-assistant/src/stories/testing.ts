//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import type { Schema } from 'effect';
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
import { Config } from '@dxos/react-client';
import { DataTypes } from '@dxos/schema';
import { IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';

export const testPlugins = ({
  config,
  types = [],
  indexConfig,
}: { config?: ConfigProto; types?: Schema.Schema.AnyNoContext[]; indexConfig?: IndexConfig } = {}) => [
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
    types: DataTypes,
    onClientInitialized: async (_, client) => {
      client.addTypes(types);

      if (!client.halo.identity.get()) {
        await client.halo.createIdentity();
      }

      if (indexConfig) {
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
