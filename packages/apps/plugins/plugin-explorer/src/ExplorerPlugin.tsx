//
// Copyright 2023 DXOS.org
//

import { type PluginDefinition } from '@dxos/react-surface';

import { ExplorerMain } from './components';
import translations from './translations';
import { EXPLORER_PLUGIN, type ExplorerPluginProvides } from './types';

export const ExplorerPlugin = (): PluginDefinition<ExplorerPluginProvides> => {
  return {
    meta: {
      id: EXPLORER_PLUGIN,
    },
    provides: {
      translations,
      graph: {
        nodes: (parent) => {
          if (parent.id !== 'root') {
          }
        },
      },
      components: {
        ExplorerMain,
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
          }
        },
      },
    },
  };
};
