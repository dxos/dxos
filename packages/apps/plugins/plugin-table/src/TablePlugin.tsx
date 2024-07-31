//
// Copyright 2023 DXOS.org
//

import { type IconProps, Table } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { TableType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, NavigationAction } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';

import { TableMain, TableSection, TableSlide, TableArticle } from './components';
import meta, { TABLE_PLUGIN } from './meta';
import translations from './translations';
import { TableAction, type TablePluginProvides, isTable } from './types';

export const TablePlugin = (): PluginDefinition<TablePluginProvides> => {
  return {
    meta,
    ready: async (plugins) => {
      const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
      clientPlugin?.provides.client.addTypes([TableType]);
    },
    provides: {
      metadata: {
        records: {
          [TableType.typename]: {
            label: (object: any) => (object instanceof TableType ? object.name : undefined),
            placeholder: ['object placeholder', { ns: TABLE_PLUGIN }],
            icon: (props: IconProps) => <Table {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: TableAction.CREATE,
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
                  id: `${TABLE_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: TABLE_PLUGIN, action: TableAction.CREATE },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create object label', { ns: TABLE_PLUGIN }],
                    icon: (props: IconProps) => <Table {...props} />,
                    testId: 'tablePlugin.createObject',
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
              return isTable(data.active) ? <TableMain table={data.active} /> : null;
            case 'slide':
              return isTable(data.slide) ? <TableSlide table={data.slide} /> : null;
            case 'section':
              return isTable(data.object) ? <TableSection table={data.object} /> : null;
            case 'article':
              return isTable(data.object) ? <TableArticle table={data.object} /> : null;
            default:
              return null;
          }
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-table',
            testId: 'tablePlugin.createSectionSpaceSketch',
            label: ['create stack section label', { ns: TABLE_PLUGIN }],
            icon: (props: any) => <Table {...props} />,
            intent: [{ plugin: TABLE_PLUGIN, action: TableAction.CREATE }],
          },
        ],
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TableAction.CREATE: {
              return {
                data: create(TableType, { name: '', props: [] }),
              };
            }
          }
        },
      },
    },
  };
};
