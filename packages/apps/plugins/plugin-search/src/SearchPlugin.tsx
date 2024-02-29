//
// Copyright 2023 DXOS.org
//

import { type IconProps, MagnifyingGlass } from '@phosphor-icons/react';
import React from 'react';

import { getActiveSpace } from '@braneframe/plugin-space';
import {
  type PluginDefinition,
  type LocationProvides,
  type GraphProvides,
  type Plugin,
  resolvePlugin,
  parseIntentPlugin,
  parseGraphPlugin,
  parseNavigationPlugin,
  LayoutAction,
} from '@dxos/app-framework';

import { SearchMain } from './components';
import { SearchContextProvider } from './context';
import meta, { SEARCH_PLUGIN, SEARCH_RESULT } from './meta';
import type { SearchResult } from './search';
import translations from './translations';
import { SearchAction, type SearchPluginProvides } from './types';

export const SearchPlugin = (): PluginDefinition<SearchPluginProvides> => {
  let navigationPlugin: Plugin<LocationProvides> | undefined;
  let graphPlugin: Plugin<GraphProvides> | undefined;

  return {
    meta,
    ready: async (plugins) => {
      navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
    },
    provides: {
      translations,
      metadata: {
        records: {
          [SEARCH_RESULT]: {
            parse: (item: SearchResult, type: string) => {
              switch (type) {
                case 'node':
                  return { id: item.id, label: item.label, data: item.object };
                case 'object':
                  return item.object;
                case 'view-object':
                  return item;
              }
            },
          },
        },
      },
      graph: {
        builder: (plugins, graph) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          graph.addNodes({
            id: SearchAction.SEARCH,
            data: () =>
              intentPlugin?.provides.intent.dispatch({
                plugin: SEARCH_PLUGIN,
                action: SearchAction.SEARCH,
              }),
            properties: {
              label: ['search action label', { ns: SEARCH_PLUGIN }],
              icon: (props: IconProps) => <MagnifyingGlass {...props} />,
              keyBinding: 'shift+meta+f',
              testId: 'searchPlugin.search',
            },
            edges: [['root', 'inbound']],
          });
        },
      },
      context: ({ children }) => <SearchContextProvider>{children}</SearchContextProvider>,
      surface: {
        component: ({ role }) => {
          const location = navigationPlugin?.provides.location;
          const graph = graphPlugin?.provides.graph;
          const space = graph && location ? getActiveSpace(graph, location.active) : undefined;
          switch (role) {
            case 'search-input':
              return space ? <SearchMain space={space} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent, plugins) => {
          switch (intent.action) {
            case SearchAction.SEARCH: {
              const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
              return intentPlugin?.provides.intent.dispatch({
                action: LayoutAction.SET_LAYOUT,
                data: { element: 'complementary', state: true },
              });
            }
          }
        },
      },
    },
  };
};
