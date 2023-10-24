//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { type IntentPluginProvides } from '@braneframe/plugin-intent';
import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { SplitViewAction } from '@braneframe/plugin-splitview';
import { Grid as GridType } from '@braneframe/types';
import { SpaceProxy } from '@dxos/client/echo';
import { findPlugin, type PluginDefinition } from '@dxos/react-surface';

import { GridMain } from './components';
import translations from './translations';
import { isGrid, GRID_PLUGIN, GridAction, type GridPluginProvides } from './types';
import { objectToGraphNode } from './util';

export const GridPlugin = (): PluginDefinition<GridPluginProvides> => {
  let adapter: GraphNodeAdapter<GridType> | undefined;

  return {
    meta: {
      id: GRID_PLUGIN,
    },
    ready: async (plugins) => {
      const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
      const dispatch = intentPlugin?.provides.intent.dispatch;
      if (dispatch) {
        adapter = new GraphNodeAdapter({
          dispatch,
          filter: GridType.filter(),
          adapter: objectToGraphNode,
        });
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
            id: `${GRID_PLUGIN}/create`,
            label: ['create grid label', { ns: GRID_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: GRID_PLUGIN,
                  action: GridAction.CREATE,
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
              testId: 'gridPlugin.createObject',
            },
          });

          return adapter?.createNodes(space, parent);
        },
      },
      component: (data, role) => {
        if (!data || typeof data !== 'object' || !isGrid(data)) {
          return null;
        }

        switch (role) {
          case 'main':
            return GridMain;
        }

        return null;
      },
      components: {
        GridMain,
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case GridAction.CREATE: {
              return { object: new GridType() };
            }
          }
        },
      },
    },
  };
};
