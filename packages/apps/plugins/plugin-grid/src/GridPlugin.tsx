//
// Copyright 2023 DXOS.org
//

import { type IconProps, Plus, SquaresFour } from '@phosphor-icons/react';
import React from 'react';

import { SpaceAction } from '@braneframe/plugin-space';
import { Folder, Grid as GridType } from '@braneframe/types';
import { LayoutAction, parseIntentPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';

import { GridMain } from './components';
import translations from './translations';
import { GRID_PLUGIN, GridAction, type GridPluginProvides, isGrid } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[GridType.name] = GridType;

export const GridPlugin = (): PluginDefinition<GridPluginProvides> => {
  return {
    meta: {
      id: GRID_PLUGIN,
    },
    provides: {
      metadata: {
        records: {
          [GridType.schema.typename]: {
            fallbackName: ['grid title placeholder', { ns: GRID_PLUGIN }],
            icon: (props: IconProps) => <SquaresFour {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

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
                  action: SpaceAction.ADD_TO_FOLDER,
                  data: { spaceKey: parent.data },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'gridPlugin.createObject',
            },
          });
        },
      },
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main':
              return isGrid(data.active) ? <GridMain grid={data.active} /> : null;
          }

          return null;
        },
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
