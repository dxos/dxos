//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction, getIndices } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Kanban as KanbanType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { KanbanMain } from './components';
import { isKanban, KANBAN_PLUGIN, KanbanAction, KanbanPluginProvides, kanbanToGraphNode } from './props';
import translations from './translations';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  const adapter = new GraphNodeAdapter(KanbanType.filter(), kanbanToGraphNode);

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
        actions: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          return [
            {
              id: `${KANBAN_PLUGIN}/create-kanban`, // TODO(burdon): Namespace?
              index: getIndices(1)[0],
              testId: 'kanbanPlugin.createKanban', // TODO(burdon): Namespace?
              label: ['create kanban label', { ns: KANBAN_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              intent: [
                {
                  plugin: KANBAN_PLUGIN,
                  action: KanbanAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: parent.data.key.toHex() },
                },
                {
                  action: TreeViewAction.ACTIVATE,
                },
              ],
            },
          ];
        },
      },
      component: (datum, role) => {
        if (!datum || typeof datum !== 'object') {
          return null;
        }

        switch (role) {
          case 'main':
            if ('object' in datum && isKanban(datum.object)) {
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
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case KanbanAction.CREATE: {
              return { object: new KanbanType() };
            }
          }
        },
      },
    },
  };
};
