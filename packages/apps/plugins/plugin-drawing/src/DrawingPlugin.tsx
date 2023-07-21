//
// Copyright 2023 DXOS.org
//

import { CompassTool, IconProps, Plus, Trash } from '@phosphor-icons/react';
import React from 'react';

import { GraphNode } from '@braneframe/plugin-graph';
import { GraphNodeAdapter } from '@braneframe/plugin-space';
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { Drawing as DrawingType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';

import { DrawingMain } from './components';
import { isDrawing, DRAWING_PLUGIN, DrawingPluginProvides } from './props';
import translations from './translations';

export const DrawingPlugin = (): PluginDefinition<DrawingPluginProvides> => {
  const objectToGraphNode = (parent: GraphNode, object: DrawingType): GraphNode => ({
    id: object.id,
    index: 'a1',
    label: object.title ?? ['drawing title placeholder', { ns: DRAWING_PLUGIN }],
    icon: (props: IconProps) => <CompassTool {...props} />,
    data: object,
    parent,
    pluginActions: {
      [DRAWING_PLUGIN]: [
        {
          id: 'delete',
          index: 'a1',
          label: ['delete drawing label', { ns: DRAWING_PLUGIN }],
          icon: (props: IconProps) => <Trash {...props} />,
          invoke: async () => parent.data?.db.remove(object),
        },
      ],
    },
  });

  const adapter = new GraphNodeAdapter(DrawingType.filter(), objectToGraphNode);

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
        actions: (parent, _, plugins) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:treeview');
          const space = parent.data;
          return [
            {
              id: `${DRAWING_PLUGIN}/create-drawing`,
              index: 'a1',
              testId: 'drawingPlugin.createDrawing',
              label: ['create drawing label', { ns: DRAWING_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              invoke: async () => {
                const object = space.db.add(new DrawingType());
                if (treeViewPlugin) {
                  treeViewPlugin.provides.treeView.selected = [parent.id, object.id];
                }
              },
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
    },
  };
};
