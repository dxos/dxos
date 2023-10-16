//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { SplitViewAction } from '@braneframe/plugin-splitview';
import { Grid as GridType } from '@braneframe/types';
import { Mosaic } from '@dxos/aurora-grid/next';
import { SpaceProxy } from '@dxos/client/echo';
import { type PluginDefinition } from '@dxos/react-surface';

import { GridMain } from './components';
import translations from './translations';
import { isGrid, GRID_PLUGIN, GridAction, type GridPluginProvides } from './types';
import { objectToGraphNode } from './util';

export const GridPlugin = (): PluginDefinition<GridPluginProvides> => {
  const adapter = new GraphNodeAdapter({ filter: GridType.filter(), adapter: objectToGraphNode });

  return {
    meta: {
      id: GRID_PLUGIN,
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      translations,
      graph: {
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          parent.addAction({
            id: `${GRID_PLUGIN}/create`,
            label: ['create grid label', { ns: GRID_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            intent: [
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
            ],
            properties: {
              // TODO(burdon): Change all to gridPlugin.create.
              testId: 'gridPlugin.createGrid',
            },
          });

          return adapter.createNodes(space, parent);
        },
      },
      context: ({ children }) => {
        return <Mosaic.Root>{children}</Mosaic.Root>;
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
