//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal';
import React from 'react';

import { Mosaic } from '@dxos/aurora-grid/next';
import { type Plugin, type PluginDefinition } from '@dxos/react-surface';

import { DND_PLUGIN, type DndStore, type DndProvides } from './types';

export const DndPlugin = (): PluginDefinition => {
  const dnd = deepSignal<DndStore>({});
  const Overlay = () => <Mosaic.DragOverlay />;

  return {
    meta: {
      id: DND_PLUGIN,
    },
    ready: async (plugins) => {
      // TODO(wittjosiah): Remove?
      const persistorPlugin = (plugins as Plugin<DndProvides>[]).find(
        (plugin) => typeof plugin.provides.dnd?.appState === 'function',
      );

      if (persistorPlugin) {
        dnd.appState = persistorPlugin.provides.dnd.appState();
      }
    },
    provides: {
      components: {
        default: Overlay,
      },
      context: ({ children }) => {
        return <Mosaic.Root debug>{children}</Mosaic.Root>;
      },
    },
  };
};
