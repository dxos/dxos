//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  Capability,
  createResolver,
} from '@dxos/app-framework';
import { JsonSchema, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Kanban } from '@dxos/react-ui-kanban/types';
import { ProjectionModel, View, getTypenameFromQuery } from '@dxos/schema';

import { meta } from '../meta';
import { KanbanAction } from '../types';

export default Capability.makeModule((context) =>
  Capability.contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: KanbanAction.Create,
      resolve: async ({ db, name, typename, initialPivotColumn }) => {
        const { view } = await View.makeFromDatabase({ db, typename, pivotFieldName: initialPivotColumn });
        const kanban = Kanban.make({ name, view });
        return { data: { object: kanban } };
      },
    }),
    createResolver({
      intent: KanbanAction.DeleteCardField,
      resolve: async ({ view, fieldId, deletionData }, undo) => {
        const db = Obj.getDatabase(view);
        invariant(db, 'Database not found');
        const schema = await db.schemaRegistry
          .query({
            typename: getTypenameFromQuery(view.query.ast)!,
            location: ['database', 'runtime'],
          })
          .first();
        const projection = new ProjectionModel(JsonSchema.toJsonSchema(schema), view.projection);

        if (!undo) {
          const { deleted, index } = projection.deleteFieldProjection(fieldId);
          return {
            undoable: {
              message: ['card field deleted label', { ns: meta.id }],
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
        const db = Obj.getDatabase(card);
        invariant(db);

        if (!undo) {
          db.remove(card);
          return {
            undoable: {
              message: ['card deleted label', { ns: meta.id }],
              data: { card },
            },
          };
        } else {
          db.add(card);
        }
      },
    }),
  ]),
);
