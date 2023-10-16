//
// Copyright 2023 DXOS.org
//

import { type PluginDefinition } from '@dxos/react-surface';

import translations from './translations';
import { GRID_PLUGIN, type GridPluginProvides } from './types';

export const GridPlugin = (): PluginDefinition<GridPluginProvides> => {
  return {
    meta: {
      id: GRID_PLUGIN,
    },
    provides: {
      translations,
      graph: {
        withPlugins: (plugins) => (parent) => {},
      },
      component: (data, role) => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        switch (role) {
          case 'main':
            return null;
        }

        return null;
      },
    },
  };
};
