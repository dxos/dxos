//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition } from '@dxos/react-surface';
import { Mosaic } from '@dxos/react-ui-mosaic';

export const DND_PLUGIN = 'dxos.org/plugin/dnd';

// TODO(wittjosiah): Roll into layout plugin?
export const DndPlugin = ({ debug }: { debug?: boolean } = {}): PluginDefinition => ({
  meta: {
    id: DND_PLUGIN,
  },
  provides: {
    context: ({ children }) => {
      return <Mosaic.Root debug={debug}>{children}</Mosaic.Root>;
    },
    root: () => <Mosaic.DragOverlay debug={debug} />,
  },
});
