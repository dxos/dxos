//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver, type PluginContext } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { getSpace } from '@dxos/react-client/echo';
import { ProjectionManager } from '@dxos/schema';

import { KANBAN_PLUGIN } from '../meta';
import { initializeKanban } from '../testing';
import { KanbanAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: KanbanAction.Create,
      resolve: async ({ space, name, typename, initialPivotColumn }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const { kanban } = await initializeKanban({ client, space, name, typename, initialPivotColumn });
        return { data: { object: kanban } };
      },
    }),
    createResolver({
      intent: KanbanAction.DeleteCardField,
      resolve: ({ kanban, fieldId, deletionData }, undo) => {
        invariant(kanban.cardView);
        invariant(kanban.cardView.target?.query.typename);

        const schema =
          kanban.cardView.target &&
          getSpace(kanban)?.db.schemaRegistry.getSchema(kanban.cardView.target.query.typename);
        invariant(schema);
        invariant(kanban.cardView.target);
        const projection = new ProjectionManager(schema.jsonSchema, kanban.cardView.target);

        if (!undo) {
          const { deleted, index } = projection.deleteFieldProjection(fieldId);
          return {
            undoable: {
              message: ['card field deleted label', { ns: KANBAN_PLUGIN }],
              data: { deletionData: { ...deleted, index } },
            },
          };
        } else if (undo && deletionData) {
          const { field, props, index } = deletionData;
          projection.setFieldProjection({ field, props }, index);
        }
      },
    }),
    createResolver({
      intent: KanbanAction.DeleteCard,
      resolve: ({ card }, undo) => {
        const space = getSpace(card);
        invariant(space);

        if (!undo) {
          space.db.remove(card);
          return {
            undoable: {
              message: ['card deleted label', { ns: KANBAN_PLUGIN }],
              data: { card },
            },
          };
        } else {
          space.db.add(card);
        }
      },
    }),
  ]);
