//
// Copyright 2023 DXOS.org
//

import { PluginDefinition } from '@dxos/react-surface';

import { SearchMain } from './components';
import translations from './translations';
import { SEARCH_PLUGIN, SearchPluginProvides } from './types';

export const SearchPlugin = (): PluginDefinition<SearchPluginProvides> => {
  return {
    meta: {
      id: SEARCH_PLUGIN,
    },
    provides: {
      translations,
      component: (data, role) => {
        switch (role) {
          case 'main':
            return SearchMain;
        }
      },
      components: {
        SearchMain,
      },
      intent: {
        resolver: (intent) => {},
      },
    },
  };
};
