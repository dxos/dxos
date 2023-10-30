//
// Copyright 2023 DXOS.org
//

import { Kanban } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { Kanban as KanbanType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/client/echo';

import { KanbanMain } from './components';
import translations from './translations';
import { isKanban, KANBAN_PLUGIN, KanbanAction, type KanbanPluginProvides } from './types';
import { objectToGraphNode } from './util';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  let adapter: GraphNodeAdapter<KanbanType> | undefined;

  return {
    meta: {
      id: KANBAN_PLUGIN,
    },
    ready: async (plugins) => {
      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const dispatch = intentPlugin?.provides?.intent?.dispatch;
      if (dispatch) {
        adapter = new GraphNodeAdapter({ dispatch, filter: KanbanType.filter(), adapter: objectToGraphNode });
      }
    },
    unload: async () => {
      adapter?.clear();
    },
    provides: {
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap['create-object-group']?.addAction({
            id: `${KANBAN_PLUGIN}/create`,
            label: ['create kanban label', { ns: KANBAN_PLUGIN }],
            icon: (props) => <Kanban {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: KANBAN_PLUGIN,
                  action: KanbanAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: parent.data.key.toHex() },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'kanbanPlugin.createObject',
            },
          });

          return adapter?.createNodes(space, parent);
        },
      },
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main':
              return isKanban(data.active) ? <KanbanMain kanban={data.active} /> : null;
            default:
              return null;
          }
        },
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
