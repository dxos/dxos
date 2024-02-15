//
// Copyright 2023 DXOS.org
//

import { Brain } from '@phosphor-icons/react';
import React from 'react';

import { isMarkdownProperties } from '@braneframe/plugin-markdown';
import { type Document as DocumentType } from '@braneframe/types';
import {
  resolvePlugin,
  parseGraphPlugin,
  parseIntentPlugin,
  parseNavigationPlugin,
  type GraphProvides,
  type LocationProvides,
  type Plugin,
  type PluginDefinition,
} from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { getSpaceForObject, isTypedObject } from '@dxos/react-client/echo';

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
      settings.prop('apiKey', LocalStorageStore.string({ allowUndefined: true }));

      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
    },
    provides: {
      settings: settings.values,
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (isMarkdownProperties(parent.data)) {
            const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

            parent.addAction({
              id: `${GPT_PLUGIN}/analyze`,
              label: ['analyze document label', { ns: GPT_PLUGIN }],
              icon: (props) => <Brain {...props} />,
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([
                  {
                    plugin: GPT_PLUGIN,
                    action: GptAction.ANALYZE,
                  },
                ]),
            });
          }
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
              const activeNode = location?.active ? graph?.findNode(location.active) : undefined;
              const active = activeNode?.data;
              const space = isTypedObject(active) && getSpaceForObject(active);
              if (space && settings.values.apiKey) {
                // TODO(burdon): Toast on success.
                void new GptAnalyzer({ apiKey: settings.values.apiKey }).exec(space, active as DocumentType);
              }
            }
          }
        },
      },
    },
  };
};
