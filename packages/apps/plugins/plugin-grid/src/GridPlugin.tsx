//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Mosaic } from '@dxos/aurora-grid/next';
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
      context: ({ children }) => {
        return <Mosaic.Root>{children}</Mosaic.Root>;
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
