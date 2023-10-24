//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { View as ViewType } from '@braneframe/types';
import { parseIntentPlugin, resolvePlugin, type PluginDefinition, LayoutAction } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/client/echo';

import { ExplorerMain } from './components';
import translations from './translations';
import { EXPLORER_PLUGIN, ExplorerAction, type ExplorerPluginProvides, isExplorer } from './types';
import { objectToGraphNode } from './util';

export const ExplorerPlugin = (): PluginDefinition<ExplorerPluginProvides> => {
  let adapter: GraphNodeAdapter<ViewType> | undefined;

  return {
    meta: {
      id: EXPLORER_PLUGIN,
    },
    ready: async (plugins) => {
      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const dispatch = intentPlugin?.provides.intent.dispatch;
      if (dispatch) {
        adapter = new GraphNodeAdapter({ dispatch, filter: ViewType.filter(), adapter: objectToGraphNode });
      }
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

          // TODO(burdon): Util.
          parent.addAction({
            id: `${EXPLORER_PLUGIN}/create`,
            label: ['create object label', { ns: EXPLORER_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: EXPLORER_PLUGIN,
                  action: ExplorerAction.CREATE,
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
              testId: 'explorerPlugin.createObject',
            },
          });

          return adapter?.createNodes(space, parent);
        },
      },
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main':
              return isExplorer(data.active) ? <ExplorerMain /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ExplorerAction.CREATE: {
              return { object: new ViewType() };
            }
          }
        },
      },
    },
  };
};
