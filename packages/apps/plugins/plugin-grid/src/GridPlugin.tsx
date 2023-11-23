//
// Copyright 2023 DXOS.org
//

import { type IconProps, SquaresFour } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Grid as GridType } from '@braneframe/types';
import { LayoutAction, parseIntentPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { GridMain } from './components';
import meta, { GRID_PLUGIN } from './meta';
import translations from './translations';
import { GridAction, type GridPluginProvides, isGrid } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[GridType.name] = GridType;

export const GridPlugin = (): PluginDefinition<GridPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [GridType.schema.typename]: {
            placeholder: ['grid title placeholder', { ns: GRID_PLUGIN }],
            icon: (props: IconProps) => <SquaresFour {...props} />,
          },
          [GridType.Item.schema.typename]: {
            parse: (item: GridType.Item, type: string) => {
              switch (type) {
                case 'node': {
                  return { id: item.object.id, label: item.object.title, data: item.object };
                }

                case 'object': {
                  return item.object;
                }

                case 'view-object': {
                  return item;
                }

                default:
                  return undefined;
              }
            },
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder || parent.data instanceof SpaceProxy)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
            id: `${GRID_PLUGIN}/create`,
            label: ['create grid label', { ns: GRID_PLUGIN }],
            icon: (props) => <SquaresFour {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: GRID_PLUGIN,
                  action: GridAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { target: parent.data },
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
        component: ({ data, role }) => {
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
