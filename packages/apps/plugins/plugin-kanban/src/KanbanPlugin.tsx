//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { type IntentPluginProvides } from '@braneframe/plugin-intent';
import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { SplitViewAction } from '@braneframe/plugin-splitview';
import { Kanban as KanbanType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { findPlugin, type PluginDefinition } from '@dxos/react-surface';

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
      const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
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
        withPlugins: (plugins) => (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;
          const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');

          parent.addAction({
            id: `${KANBAN_PLUGIN}/create`,
            label: ['create kanban label', { ns: KANBAN_PLUGIN }],
            icon: (props) => <Plus {...props} />,
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
                  action: SplitViewAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'kanbanPlugin.createObject',
            },
          });

          return adapter?.createNodes(space, parent);
        },
      },
      component: (data, role) => {
        if (!data || typeof data !== 'object' || !isKanban(data)) {
          return null;
        }

        switch (role) {
          case 'main':
            return KanbanMain;
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
