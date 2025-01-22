//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';
import { ViewProjection } from '@dxos/schema';

import { KANBAN_PLUGIN } from '../meta';
import { createKanban, KanbanAction } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver(KanbanAction.Create, async ({ space }) => ({
      data: { object: await createKanban(space) },
    })),
    createResolver(KanbanAction.DeleteCardField, ({ kanban, fieldId, deletionData }, undo) => {
      invariant(kanban.cardView);

      const schema =
        kanban.cardView.target && getSpace(kanban)?.db.schemaRegistry.getSchema(kanban.cardView.target.query.type);
      invariant(schema);
      const projection = new ViewProjection(schema, kanban.cardView.target!);

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
    }),
  ]);
