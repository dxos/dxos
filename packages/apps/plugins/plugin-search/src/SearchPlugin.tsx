//
// Copyright 2023 DXOS.org
//

import { type IconProps, MagnifyingGlass } from '@phosphor-icons/react';
import React from 'react';

import { createExtension, type Node } from '@braneframe/plugin-graph';
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
  firstMainId,
} from '@dxos/app-framework';

import { SearchDialog, SearchMain } from './components';
import { SearchContextProvider } from './context';
import meta, { SEARCH_PLUGIN, SEARCH_RESULT } from './meta';
import type { SearchResult } from './search-sync';
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
        builder: (plugins) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          return createExtension({
            id: SEARCH_PLUGIN,
            filter: (node): node is Node<null> => node.id === 'root',
            actions: () => [
              {
                id: SearchAction.SEARCH,
                data: async () => {
                  await intentPlugin?.provides.intent.dispatch({
                    plugin: SEARCH_PLUGIN,
                    action: SearchAction.SEARCH,
                  });
                },
                properties: {
                  label: ['search action label', { ns: SEARCH_PLUGIN }],
                  icon: (props: IconProps) => <MagnifyingGlass {...props} />,
                  keyBinding: {
                    macos: 'shift+meta+f',
                    windows: 'shift+alt+f',
                  },
                  testId: 'searchPlugin.search',
                },
              },
            ],
          });
        },
      },
      context: ({ children }) => <SearchContextProvider>{children}</SearchContextProvider>,
      surface: {
        component: ({ data, role }) => {
          const location = navigationPlugin?.provides.location;
          const graph = graphPlugin?.provides.graph;
          const space = graph && location ? getActiveSpace(graph, firstMainId(location.active)) : undefined;

          switch (role) {
            case 'dialog':
              return data.component === `${SEARCH_PLUGIN}/Dialog` ? (
                <SearchDialog subject={data.subject as any} />
              ) : null;
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
