//
// Copyright 2023 DXOS.org
//

import { getSpace } from '@dxos/react-client/echo';
import { type FieldProjection, ViewProjection } from '@dxos/schema';
import React from 'react';

import { resolvePlugin, type PluginDefinition, parseIntentPlugin, NavigationAction } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
import { KanbanType } from '@dxos/react-ui-kanban';

import { KanbanContainer } from './components';
import { createKanban } from './components/create-kanban';
import KanbanViewEditor from './components/KanbanViewEditor';
import meta, { KANBAN_PLUGIN } from './meta';
import translations from './translations';
import { isKanban, KanbanAction, type KanbanPluginProvides } from './types';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [KanbanType.typename]: {
            createObject: KanbanAction.CREATE,
            placeholder: ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
            icon: 'ph--kanban--regular',
          },
        },
      },
      echo: {
        schema: [KanbanType],
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
                    icon: 'ph--kanban--regular',
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
            case 'section':
            case 'article':
              return isKanban(data.object) ? <KanbanContainer kanban={data.object} role={role} /> : null;
            case 'complementary--settings':
              return isKanban(data.subject) ? { node: <KanbanViewEditor kanban={data.subject} /> } : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case KanbanAction.CREATE: {
              const { space } = intent.data as KanbanAction.Create;
              invariant(space);
              const kanban = createKanban(space);
              return {data: kanban}
            }
            case KanbanAction.DELETE_CARD_FIELD: {
              const { kanban, fieldId } = intent.data as KanbanAction.DeleteColumn;
              invariant(isKanban(kanban));
              invariant(kanban.cardView);

              const schema = kanban.cardView && getSpace(kanban)?.db.schemaRegistry.getSchema(kanban.cardView.query.type);
              invariant(schema);
              const projection = new ViewProjection(schema, kanban.cardView);

              if (!intent.undo) {
                const { deleted, index } = projection.deleteFieldProjection(fieldId);
                return {
                  undoable: {
                    message: translations[0]['en-US'][KANBAN_PLUGIN]['card field deleted label'],
                    data: { deleted, index },
                  },
                };
              } else if (intent.undo) {
                const { deleted, index } = intent.data as { deleted: FieldProjection; index: number };
                projection.setFieldProjection(deleted, index);
                return { data: true };
              }
            }
          }
        },
      },
    },
  };
};
