//
// Copyright 2023 DXOS.org
//

import { type IconProps, Kanban } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, NavigationAction } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { KanbanMain } from './components';
import meta, { KANBAN_PLUGIN } from './meta';
import translations from './translations';
import { KanbanColumnType, KanbanItemType, KanbanType } from './types';
import { KanbanAction, type KanbanPluginProvides } from './types';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [KanbanType.typename]: {
            placeholder: ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
            icon: (props: IconProps) => <Kanban {...props} />,
            iconSymbol: 'ph--kanban--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (kanban: KanbanType) => loadObjectReferences(kanban, (kanban) => kanban.columns),
          },
          [KanbanColumnType.typename]: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (column: KanbanColumnType) => loadObjectReferences(column, (column) => column.items),
          },
          [KanbanItemType.typename]: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (item: KanbanItemType) => [], // loadObjectReferences(item, (item) => item.object),
          },
        },
      },
      echo: {
        schema: [KanbanType, KanbanColumnType, KanbanItemType],
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
            id: KanbanAction.CREATE,
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
                  id: `${KANBAN_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: KANBAN_PLUGIN, action: KanbanAction.CREATE },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create kanban label', { ns: KANBAN_PLUGIN }],
                    icon: (props: IconProps) => <Kanban {...props} />,
                    iconSymbol: 'ph--kanban--regular',
                    testId: 'kanbanPlugin.createObject',
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
              return data.active instanceof KanbanType ? <KanbanMain kanban={data.active} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case KanbanAction.CREATE: {
              return { data: create(KanbanType, { columns: [] }) };
            }
          }
        },
      },
    },
  };
};
