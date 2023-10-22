//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass, Plus } from '@phosphor-icons/react';
import React from 'react';

import { type SplitViewPluginProvides } from '@braneframe/plugin-splitview';
import { SpaceProxy } from '@dxos/client/echo';
import { type PluginDefinition, findPlugin } from '@dxos/react-surface';

import { SearchMain } from './components';
import { SearchContextProvider } from './context';
import translations from './translations';
import { SEARCH_PLUGIN, type SearchPluginProvides, SearchAction } from './types';

export const SearchPlugin = (): PluginDefinition<SearchPluginProvides> => {
  return {
    meta: {
      id: SEARCH_PLUGIN,
    },
    provides: {
      translations,
      graph: {
        nodes: (parent) => {
          if (parent.id === 'root') {
            parent.addAction({
              id: SearchAction.SEARCH,
              label: ['search action label', { ns: SEARCH_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              intent: [
                {
                  plugin: SEARCH_PLUGIN,
                  action: SearchAction.SEARCH,
                },
              ],
              properties: {
                testId: 'searchPlugin.search',
              },
            });
          }

          if (parent.data instanceof SpaceProxy) {
            parent.addAction({
              id: SearchAction.SEARCH,
              label: ['search action label', { ns: SEARCH_PLUGIN }],
              icon: (props) => <MagnifyingGlass {...props} />,
              keyBinding: 'shift+meta+f',
              intent: [
                {
                  plugin: SEARCH_PLUGIN,
                  action: SearchAction.SEARCH,
                },
              ],
              properties: {
                testId: 'searchPlugin.search',
              },
            });
          }
        },
      },
      context: ({ children }) => <SearchContextProvider>{children}</SearchContextProvider>,
      component: (data, role) => {
        switch (role) {
          case 'context-search':
            return SearchMain;
        }
      },
      components: {
        SearchMain,
      },
      intent: {
        resolver: (intent, plugins) => {
          switch (intent.action) {
            case SearchAction.SEARCH: {
              const splitViewPlugin = findPlugin<SplitViewPluginProvides>(plugins, 'dxos.org/plugin/splitview');
              splitViewPlugin!.provides.splitView.complementarySidebarOpen = true;
              console.log('::');
            }
          }
        },
      },
    },
  };
};
