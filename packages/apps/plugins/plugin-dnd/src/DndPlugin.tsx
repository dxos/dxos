//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Mosaic } from '@dxos/aurora-grid/next';
import { type PluginDefinition } from '@dxos/react-surface';

export const DND_PLUGIN = 'dxos.org/plugin/dnd';

// TODO(wittjosiah): Roll into layout plugin?
export const DndPlugin = (): PluginDefinition => {
  const Overlay = () => <Mosaic.DragOverlay />;

  return {
    meta: {
      id: DND_PLUGIN,
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
