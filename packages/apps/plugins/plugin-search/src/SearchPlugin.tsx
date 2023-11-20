//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from '@phosphor-icons/react';
import React from 'react';

import { Folder } from '@braneframe/types';
import { type PluginDefinition, resolvePlugin, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { SearchMain } from './components';
import { SearchContextProvider } from './context';
import meta, { SEARCH_PLUGIN } from './meta';
import translations from './translations';
import { SearchAction, type SearchPluginProvides } from './types';

export const SearchPlugin = (): PluginDefinition<SearchPluginProvides> => {
  return {
    meta,
    provides: {
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          if (parent.id === 'root' || parent.data instanceof Folder || parent.data instanceof SpaceProxy) {
            parent.addAction({
              id: SearchAction.SEARCH,
              label: ['search action label', { ns: SEARCH_PLUGIN }],
              icon: (props) => <MagnifyingGlass {...props} />,
              keyBinding: 'shift+meta+s',
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
        component: ({ data, role }) => {
          switch (role) {
            case 'context-search':
              return <SearchMain />;
          }
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
