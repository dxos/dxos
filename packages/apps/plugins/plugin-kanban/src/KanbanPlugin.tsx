//
// Copyright 2023 DXOS.org
//

import { IconProps, Kanban, Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNode } from '@braneframe/plugin-graph';
import { TreeViewProvides } from '@braneframe/plugin-treeview';
import { Kanban as KanbanType } from '@braneframe/types';
import { UnsubscribeCallback } from '@dxos/async';
import { Query, SpaceProxy, subscribe } from '@dxos/client';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';
import { defaultMap } from '@dxos/util';

import { KanbanMain } from './components';
import { isKanban, KANBAN_PLUGIN, KanbanPluginProvides } from './props';
import translations from './translations';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  const queries = new Map<string, Query<KanbanType>>();
  const subscriptions = new Map<string, UnsubscribeCallback>();

  return {
    meta: {
      // TODO(burdon): Make id consistent with other plugins.
      id: KANBAN_PLUGIN,
    },
    unload: async () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      subscriptions.clear();
      queries.clear();
    },
    provides: {
      translations,
      graph: {
        nodes: (parent, emit) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const kanbanToGraphNode = (object: KanbanType): GraphNode => ({
            id: object.id,
            index: 'a1',
            label: object.title ?? ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
            icon: (props: IconProps) => <Kanban {...props} />,
            data: object,
            parent,
            pluginActions: {
              [KANBAN_PLUGIN]: [
                {
                  id: 'delete', // TODO(burdon): Namespace.
                  index: 'a1',
                  label: ['delete stack label', { ns: KANBAN_PLUGIN }],
                  icon: (props: IconProps) => <Kanban {...props} />,
                  invoke: async () => {
                    parent.data?.db.remove(object);
                  },
                },
              ],
            },
          });

          const space = parent.data;
          const query = defaultMap(queries, parent.id, () => {
            const query = space.db.query(KanbanType.filter());
            subscriptions.set(
              parent.id,
              query.subscribe(() => emit()),
            );
            return query;
          });

          return query.objects.map((object) => {
            defaultMap(subscriptions, object.id, () =>
              object[subscribe](() => {
                if (object.__deleted) {
                  subscriptions.delete(object.id);
                } else {
                  emit(kanbanToGraphNode(object));
                }
              }),
            );
            return kanbanToGraphNode(object);
          });
        },
        actions: (parent, _, plugins) => {
          // TODO(burdon): ???
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const treeViewPlugin = findPlugin<TreeViewProvides>(plugins, 'dxos:treeview');
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
