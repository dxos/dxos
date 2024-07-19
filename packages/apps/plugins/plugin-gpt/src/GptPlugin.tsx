//
// Copyright 2023 DXOS.org
//

import { Brain, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { createExtension, type Node } from '@braneframe/plugin-graph';
import { DocumentType } from '@braneframe/types';
import {
  resolvePlugin,
  parseGraphPlugin,
  parseIntentPlugin,
  parseNavigationPlugin,
  type GraphProvides,
  type LocationProvides,
  type Plugin,
  type PluginDefinition,
  firstMainId,
} from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';

import { GptAnalyzer } from './analyzer';
import { GptSettings } from './components';
import meta, { GPT_PLUGIN } from './meta';
import translations from './translations';
import { GptAction, type GptPluginProvides, type GptSettingsProps } from './types';

export const GptPlugin = (): PluginDefinition<GptPluginProvides> => {
  const settings = new LocalStorageStore<GptSettingsProps>(GPT_PLUGIN, {});

  let graphPlugin: Plugin<GraphProvides> | undefined;
  let navigationPlugin: Plugin<LocationProvides> | undefined;

  return {
    meta,
    ready: async (plugins) => {
      settings.prop({ key: 'apiKey', storageKey: 'api-key', type: LocalStorageStore.string({ allowUndefined: true }) });

      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
    },
    provides: {
      settings: settings.values,
      translations,
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: GptAction.ANALYZE,
            filter: (node): node is Node<DocumentType> => node.data instanceof DocumentType,
            actions: ({ node }) => [
              {
                id: `${GptAction.ANALYZE}/${fullyQualifiedId(node.data)}`,
                data: async () => {
                  await dispatch([
                    {
                      plugin: GPT_PLUGIN,
                      action: GptAction.ANALYZE,
                    },
                  ]);
                },
                properties: {
                  label: ['analyze document label', { ns: GPT_PLUGIN }],
                  icon: (props: IconProps) => <Brain {...props} />,
                },
              },
            ],
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'settings':
              return data.plugin === meta.id ? <GptSettings settings={settings.values} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case GptAction.ANALYZE: {
              // TODO(burdon): Factor out.
              const location = navigationPlugin?.provides.location;
              const graph = graphPlugin?.provides.graph;
              const activeNode = location?.active ? graph?.findNode(firstMainId(location.active)) : undefined;
              const active = activeNode?.data;
              const space = getSpace(active);
              if (space && active instanceof DocumentType && settings.values.apiKey) {
                // TODO(burdon): Toast on success.
                void new GptAnalyzer({ apiKey: settings.values.apiKey }).exec(space, active);
              }
            }
          }
        },
      },
    },
  };
};
