//
// Copyright 2023 DXOS.org
//

import { IconProps, Kanban, Plus, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { GraphNode } from '@braneframe/plugin-graph';
import { GraphNodeAdapter, getIndices } from '@braneframe/plugin-space';
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { Kanban as KanbanType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';

import { KanbanMain } from './components';
import { isKanban, KANBAN_PLUGIN, KanbanPluginProvides } from './props';
import translations from './translations';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  const objectToGraphNode = (parent: GraphNode, object: KanbanType, index: string): GraphNode => ({
    id: object.id,
    index: get(object, 'meta.index', index), // TODO(burdon): Data should not be on object?
    label: object.title ?? ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
    icon: (props: IconProps) => <Kanban {...props} />,
    data: object,
    parent,
    pluginActions: {
      [KANBAN_PLUGIN]: [
        {
          id: 'delete', // TODO(burdon): Namespac@e.
          index: 'a1',
          label: ['delete kanban label', { ns: KANBAN_PLUGIN }],
          icon: (props: IconProps) => <Trash {...props} />,
          invoke: async () => parent.data?.db.remove(object),
        },
      ],
    },
  });

  const adapter = new GraphNodeAdapter(KanbanType.filter(), objectToGraphNode);

  return {
    meta: {
      id: KANBAN_PLUGIN,
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
              id: `${KANBAN_PLUGIN}/create-kanban`, // TODO(burdon): Namespace?
              index: getIndices(1)[0],
              testId: 'kanbanPlugin.createKanban', // TODO(burdon): Namespace?
              label: ['create kanban label', { ns: KANBAN_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              invoke: async () => {
                const object = space.db.add(new KanbanType());
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
            if (Array.isArray(datum) && isKanban(datum[datum.length - 1])) {
              return KanbanMain;
            } else {
              return null;
            }
          default:
            return null;
        }
      },
      components: {
        KanbanMain,
      },
    },
  };
};
