//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Kanban as KanbanType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { KanbanMain } from './components';
import translations from './translations';
import { isKanban, KANBAN_PLUGIN, KanbanAction, KanbanPluginProvides } from './types';
import { objectToGraphNode } from './util';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
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
        actions: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          return [
            {
              id: `${KANBAN_PLUGIN}/create`,
              index: 'a1',
              testId: 'kanbanPlugin.createKanban',
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
      component: (data, role) => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        switch (role) {
          case 'main':
            if ('object' in data && isKanban(data.object)) {
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
