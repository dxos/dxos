//
// Copyright 2023 DXOS.org
//

import { IconProps, Kanban, Plus, Trash } from '@phosphor-icons/react';
import React from 'react';

import { Kanban as KanbanType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client';
import { PluginDefinition } from '@dxos/react-surface';

import { KanbanMain } from './components';
import { isKanban, KANBAN_PLUGIN, KanbanPluginProvides } from './props';
import translations from './translations';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  return {
    meta: {
      // TODO(burdon): Make id consistent with other plugins.
      id: KANBAN_PLUGIN,
    },
    provides: {
      translations,
      graph: {
        nodes: (parent, emit) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const kanbanToGraphNode = (object: KanbanType) => ({
            id: object.id,
            index: 'a1',
            label: 'New Kanban', // TODO(burdon): Translation.
            icon: (props: IconProps) => <Kanban {...props} />,
            data: object,
            parent,
            pluginActions: {
              [KANBAN_PLUGIN]: [
                {
                  id: 'delete', // TODO(burdon): Namespace.
                  index: 'a1',
                  label: ['delete stack label', { ns: KANBAN_PLUGIN }],
                  icon: Trash,
                  invoke: async () => {
                    parent.data?.db.remove(object);
                  },
                },
              ],
            },
          });

          // TODO(burdon): Subscription? Clean-up via context?
          const space = parent.data;
          const query = space.db.query(KanbanType.filter());
          return query.objects.map((stack) => kanbanToGraphNode(stack));
        },
        actions: (parent) => {
          // TODO(burdon): ???
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const space = parent.data;
          return [
            {
              id: 'create-kanban', // TODO(burdon): Namespace?
              index: 'a1', // TODO(burdon): ???
              testId: 'kanbanPlugin.createKanban', // TODO(burdon): Namespace?
              label: ['create kanban label', { ns: KANBAN_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              invoke: async () => {
                const object = space.db.add(new KanbanType());
                console.log(object);
                // if (treeViewPlugin) {
                // TODO(burdon): ???
                // treeViewPlugin.provides.treeView.selected = [parent.id, object.id];
                // }
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
