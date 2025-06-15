//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Schema } from 'effect';
import defaulstDeep from 'lodash.defaultsdeep';

import { type ExecutableTool } from '@dxos/ai';
import { EXA_API_KEY } from '@dxos/ai/testing';
import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { type BlueprintParser, createExaTool, createGraphWriterTool, createLocalSearchTool } from '@dxos/assistant';
import { type Space } from '@dxos/client/echo';
import { type ConfigProto } from '@dxos/config';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
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
import { isNonNullable } from '@dxos/util';

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
      log.info('testPlugins.onClientInitialized', { types });
      if (!client.halo.identity.get()) {
        await client.halo.createIdentity();
      }

      client.addTypes(types);

      // TODO(burdon): Not working.
      if (indexConfig) {
        // TODO(burdon): Rename services.services?
        // await client.services.services.QueryService!.setConfig(indexConfig);
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

// TODO(dmaretskyi): make db available through services (same as function executor).
// TODO(burdon): Can tools implement "aspects" so that variants can be used rather than an explicit reference?
export const createTools = (space: Space, queueDxn?: DXN): ExecutableTool[] => {
  return [
    createExaTool({ apiKey: EXA_API_KEY }),
    createLocalSearchTool(space.db),
    queueDxn &&
      createGraphWriterTool({
        db: space.db,
        schemaTypes: DataTypes,
        onDone: async (objects) => {
          const queue = space.queues.get(queueDxn);
          queue.append(objects);
        },
      }),
  ].filter(isNonNullable);
};

export const blueprintDefinition: BlueprintParser.DSL = {
  steps: [
    {
      instructions: 'Research information and entities related to the selected objects.',
      tools: ['search/web_search'],
    },
    {
      instructions:
        'Based on your research find matching entires that are already in the graph. Do exaustive research.',
      tools: ['example/local_search'],
    },
    {
      instructions: 'Add researched data to the graph. Make connections to existing objects.',
      tools: ['example/local_search', 'graph/writer'],
    },
  ],
};
