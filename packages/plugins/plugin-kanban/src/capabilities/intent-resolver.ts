//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver, type PluginContext } from '@dxos/app-framework';
import { Ref, Relation } from '@dxos/echo';
import { type EchoSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { getSpace } from '@dxos/react-client/echo';
import { type KanbanView } from '@dxos/react-ui-kanban';
import { DataType, ProjectionManager } from '@dxos/schema';

import { KANBAN_PLUGIN } from '../meta';
import { initializeKanban } from '../testing';
import { KanbanAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: KanbanAction.Create,
      resolve: async ({ space, name, typename, initialPivotColumn }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const { kanban, projection, schema } = await initializeKanban({
          client,
          space,
          name,
          typename,
          initialPivotColumn,
        });
        const hasView = Relation.make(DataType.HasView, {
          // TODO(wittjosiah): Remove cast.
          [Relation.Source]: (schema as unknown as EchoSchema).storedSchema,
          [Relation.Target]: kanban,
          projection: Ref.make(projection),
        });
        return { data: { object: kanban, relation: hasView } };
      },
    }),
    createResolver({
      intent: KanbanAction.DeleteCardField,
      resolve: async ({ view, fieldId, deletionData }, undo) => {
        // TODO(wittjosiah): Remove cast.
        const kanban = Relation.getTarget(view as any) as KanbanView;
        const projection = await view.projection.load();

        const schema = getSpace(kanban)?.db.schemaRegistry.getSchema(projection.query.typename!);
        invariant(schema);
        const projectionManager = new ProjectionManager(schema.jsonSchema, projection);

        if (!undo) {
          const { deleted, index } = projectionManager.deleteFieldProjection(fieldId);
          return {
            undoable: {
              message: ['card field deleted label', { ns: KANBAN_PLUGIN }],
              data: { deletionData: { ...deleted, index } },
            },
          };
        } else if (undo && deletionData) {
          const { field, props, index } = deletionData;
          projectionManager.setFieldProjection({ field, props }, index);
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
