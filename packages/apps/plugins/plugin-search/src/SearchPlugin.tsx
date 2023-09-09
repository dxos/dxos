//
// Copyright 2023 DXOS.org
//

import { PluginDefinition } from '@dxos/react-surface';

import translations from './translations';
import { SEARCH_PLUGIN, SearchPluginProvides } from './types';

export const SearchPlugin = (): PluginDefinition<SearchPluginProvides> => {
  return {
    meta: {
      id: SEARCH_PLUGIN,
    },
    provides: {
      translations,
      graph: {},
      intent: {
        resolver: (intent) => {},
      },
    },
  };
};
