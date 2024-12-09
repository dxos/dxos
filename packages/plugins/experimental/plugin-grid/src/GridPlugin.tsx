//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { NavigationAction, parseIntentPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/live-object';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { GridContainer } from './components';
import meta, { GRID_PLUGIN } from './meta';
import translations from './translations';
import { GridItemType, GridType } from './types';
import { GridAction, type GridPluginProvides } from './types';

export const GridPlugin = (): PluginDefinition<GridPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [GridType.typename]: {
            placeholder: ['grid title placeholder', { ns: GRID_PLUGIN }],
            icon: 'ph--squares-four--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (grid: GridType) => loadObjectReferences(grid, (grid) => grid.items),
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
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (item: GridItemType) => [], // loadObjectReferences(item, (item) => [item.object])
          },
        },
      },
      translations,
      echo: {
        schema: [GridType],
        system: [GridItemType],
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
                    icon: 'ph--squares-four--regular',
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
              return data.active instanceof GridType ? <GridContainer grid={data.active} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case GridAction.CREATE: {
              return { data: create(GridType) };
            }
          }
        },
      },
    },
  };
};
