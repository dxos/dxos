//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';

import { Drawing as DrawingType } from '@braneframe/types';
import { PluginDefinition } from '@dxos/react-surface';

import { DrawingMain } from './components';
import { isDrawing, DrawingPluginProvides } from './props';
import translations from './translations';

export const DrawingPlugin = (): PluginDefinition<DrawingPluginProvides> => ({
  meta: {
    id: 'dxos.org/plugin/drawing',
  },
  provides: {
    translations,
    space: {
      types: [
        {
          id: 'create-drawing',
          testId: 'drawingPlugin.createStack',
          label: ['create drawing label', { ns: 'dxos.org/plugin/drawing' }],
          icon: Plus,
          Type: DrawingType,
        },
      ],
    },
    component: (datum, role) => {
      switch (role) {
        case 'main':
          if (Array.isArray(datum) && isDrawing(datum[datum.length - 1])) {
            return DrawingMain;
          } else {
            return null;
          }
        default:
          return null;
      }
    },
    components: {
      DrawingMain,
    },
  },
});
