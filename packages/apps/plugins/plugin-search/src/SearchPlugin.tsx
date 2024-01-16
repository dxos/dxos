//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from '@phosphor-icons/react';
import React from 'react';

import { getActiveSpace } from '@braneframe/plugin-space';
import { Folder } from '@braneframe/types';
import {
  type PluginDefinition,
  type LayoutProvides,
  type GraphProvides,
  type Plugin,
  resolvePlugin,
  parseIntentPlugin,
  parseGraphPlugin,
  parseLayoutPlugin,
  LayoutAction,
} from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { SearchMain } from './components';
import { SearchContextProvider } from './context';
import meta, { SEARCH_PLUGIN, SEARCH_RESULT } from './meta';
import type { SearchResult } from './search';
import translations from './translations';
import { SearchAction, type SearchPluginProvides } from './types';

export const SearchPlugin = (): PluginDefinition<SearchPluginProvides> => {
  let layoutPlugin: Plugin<LayoutProvides> | undefined;
  let graphPlugin: Plugin<GraphProvides> | undefined;

  return {
    meta,
    ready: async (plugins) => {
      layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
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
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          if (parent.id === 'root' || parent.data instanceof Folder || parent.data instanceof SpaceProxy) {
            parent.addAction({
              id: SearchAction.SEARCH,
              label: ['search action label', { ns: SEARCH_PLUGIN }],
              icon: (props) => <MagnifyingGlass {...props} />,
              keyBinding: 'shift+meta+f',
              invoke: () =>
                intentPlugin?.provides.intent.dispatch({
                  plugin: SEARCH_PLUGIN,
                  action: SearchAction.SEARCH,
                }),
              properties: {
                testId: 'searchPlugin.search',
              },
            });
          }
        },
      },
      context: ({ children }) => <SearchContextProvider>{children}</SearchContextProvider>,
      surface: {
        component: ({ role }) => {
          const layout = layoutPlugin?.provides.layout;
          const graph = graphPlugin?.provides.graph;
          const space = graph && layout ? getActiveSpace(graph, layout.active) : undefined;
          switch (role) {
            case 'context-search':
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
                action: LayoutAction.TOGGLE_COMPLEMENTARY_SIDEBAR,
                data: { state: true },
              });
            }
          }
        },
      },
    },
  };
};
