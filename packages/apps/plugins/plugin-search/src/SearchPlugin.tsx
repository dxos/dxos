//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { type PluginDefinition } from '@dxos/react-surface';

import { SearchMain } from './components';
import translations from './translations';
import { SEARCH_PLUGIN, type SearchPluginProvides, SearchAction, SearchContextProvider } from './types';

// TODO(burdon): Key accelerator (to open sidebar).

export const SearchPlugin = (): PluginDefinition<SearchPluginProvides> => {
  return {
    meta: {
      id: SEARCH_PLUGIN,
    },
    provides: {
      translations,
      graph: {
        nodes: (parent) => {
          if (parent.id !== 'root') {
            return;
          }

          parent.addAction({
            id: SearchAction.SEARCH,
            label: ['search label', { ns: SEARCH_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            intent: [
              {
                plugin: SEARCH_PLUGIN,
                action: SearchAction.SEARCH,
              },
            ],
            properties: {
              testId: 'sketchPlugin.createSketch',
            },
          });
        },
      },
      context: ({ children }) => <SearchContextProvider>{children}</SearchContextProvider>,
      component: (data, role) => {
        switch (role) {
          case 'complementary':
            return SearchMain;
        }
      },
      components: {
        SearchMain,
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case SearchAction.SEARCH: {
              console.log('search');
            }
          }
        },
      },
    },
  };
};
