//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, createResolver } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { getSpace } from '@dxos/react-client/echo';
import { Kanban } from '@dxos/react-ui-kanban/types';
import { ProjectionModel, typenameFromQuery } from '@dxos/schema';

import { KANBAN_PLUGIN } from '../meta';
import { KanbanAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: KanbanAction.Create,
      resolve: async ({ space, name, typename, initialPivotColumn }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const { view } = await Kanban.makeView({
          client,
          space,
          name,
          typename,
          pivotFieldName: initialPivotColumn,
        });
        return { data: { object: view } };
      },
    }),
    createResolver({
      intent: KanbanAction.DeleteCardField,
      resolve: async ({ view, fieldId, deletionData }, undo) => {
        const schema = getSpace(view)?.db.schemaRegistry.getSchema(typenameFromQuery(view.query)!);
        invariant(schema);
        const projection = new ProjectionModel(schema.jsonSchema, view.projection);

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
