//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction, getIndices } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Drawing as DrawingType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { DrawingMain } from './components';
import { isDrawing, DRAWING_PLUGIN, DrawingPluginProvides, DrawingAction, drawingToGraphNode } from './props';
import translations from './translations';

export const DrawingPlugin = (): PluginDefinition<DrawingPluginProvides> => {
  const adapter = new GraphNodeAdapter(DrawingType.filter(), drawingToGraphNode);

  return {
    meta: {
      id: DRAWING_PLUGIN,
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      translations,
      graph: {
        nodes: (parent, emit) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const space = parent.data;
          return adapter.createNodes(space, parent, emit);
        },
        actions: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          return [
            {
              id: `${DRAWING_PLUGIN}/create-drawing`,
              index: getIndices(1)[0],
              testId: 'drawingPlugin.createDrawing',
              label: ['create drawing label', { ns: DRAWING_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              intent: [
                {
                  plugin: DRAWING_PLUGIN,
                  action: DrawingAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: parent.data.key.toHex() },
                },
                {
                  action: TreeViewAction.SELECT,
                },
              ],
            },
          ];
        },
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
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case DrawingAction.CREATE: {
              return { object: new DrawingType() };
            }
          }
        },
      },
    },
  };
};
