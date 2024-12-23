//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  type PluginDefinition,
  resolvePlugin,
  parseIntentPlugin,
  parseGraphPlugin,
  parseNavigationPlugin,
  LayoutAction,
  firstIdInPart,
  createSurface,
  createResolver,
  createIntent,
} from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { getActiveSpace } from '@dxos/plugin-space';

import { SEARCH_DIALOG, SearchDialog, type SearchDialogProps, SearchMain } from './components';
import { SearchContextProvider } from './context';
import meta, { SEARCH_PLUGIN, SEARCH_RESULT } from './meta';
import type { SearchResult } from './search-sync';
import translations from './translations';
import { SearchAction, type SearchPluginProvides } from './types';

export const SearchPlugin = (): PluginDefinition<SearchPluginProvides> => {
  return {
    meta,
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
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;

          return createExtension({
            id: SEARCH_PLUGIN,
            filter: (node): node is Node<null> => node.id === 'root',
            actions: () => [
              {
                id: SearchAction.OpenSearch._tag,
                data: async () => {
                  await dispatch?.(createIntent(SearchAction.OpenSearch));
                },
                properties: {
                  label: ['search action label', { ns: SEARCH_PLUGIN }],
                  icon: 'ph--magnifying-glass--regular',
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
        definitions: ({ plugins }) => {
          const location = resolvePlugin(plugins, parseNavigationPlugin)?.provides.location;
          const graph = resolvePlugin(plugins, parseGraphPlugin)?.provides.graph;

          return [
            createSurface({
              id: SEARCH_DIALOG,
              role: 'dialog',
              filter: (data): data is { subject: SearchDialogProps } => data.component === SEARCH_DIALOG,
              component: ({ data }) => <SearchDialog {...data.subject} />,
            }),
            createSurface({
              id: 'search-input',
              role: 'search-input',
              component: () => {
                const space =
                  graph && location ? getActiveSpace(graph, firstIdInPart(location.active, 'main')) : undefined;
                return space ? <SearchMain space={space} /> : null;
              },
            }),
          ];
        },
      },
      intent: {
        resolvers: () =>
          createResolver(SearchAction.OpenSearch, () => ({
            intents: [createIntent(LayoutAction.SetLayout, { element: 'complementary', state: true })],
          })),
      },
    },
  };
};
