//
// Copyright 2023 DXOS.org
//

import { type IconProps, SquaresFour } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { GridItemType, GridType } from '@braneframe/types';
import { NavigationAction, parseIntentPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';

import { GridMain } from './components';
import meta, { GRID_PLUGIN } from './meta';
import translations from './translations';
import { GridAction, type GridPluginProvides } from './types';

export const GridPlugin = (): PluginDefinition<GridPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [GridType.typename]: {
            placeholder: ['grid title placeholder', { ns: GRID_PLUGIN }],
            icon: (props: IconProps) => <SquaresFour {...props} />,
          },
          [GridItemType.typename]: {
            parse: (item: GridItemType, type: string) => {
              switch (type) {
                case 'node':
                  return { id: item.object?.id, label: (item.object as any).title, data: item.object };
                case 'object':
                  return item.object;
                case 'view-object':
                  return item;
              }
            },
          },
        },
      },
      translations,
      echo: {
        schema: [GridType, GridItemType],
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: GridAction.CREATE,
            filter: (node): node is ActionGroup => isActionGroup(node) && node.id.startsWith(SpaceAction.ADD_OBJECT),
            actions: ({ node }) => {
              const id = node.id.split('/').at(-1);
              const [spaceId, objectId] = id?.split(':') ?? [];
              const space = client.spaces.get().find((space) => space.id === spaceId);
              const object = objectId && space?.db.getObjectById(objectId);
              const target = objectId ? object : space;
              if (!target) {
                return;
              }

              return [
                {
                  id: `${GRID_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: GRID_PLUGIN, action: GridAction.CREATE },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create grid label', { ns: GRID_PLUGIN }],
                    icon: (props: IconProps) => <SquaresFour {...props} />,
                    testId: 'gridPlugin.createObject',
                  },
                },
              ];
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return data.active instanceof GridType ? <GridMain grid={data.active} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case GridAction.CREATE: {
              return { data: new GridType() };
            }
          }
        },
      },
    },
  };
};
