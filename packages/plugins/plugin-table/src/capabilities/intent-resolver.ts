//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver, type PluginContext } from '@dxos/app-framework';
import { Obj, Ref, Relation } from '@dxos/echo';
import { type StoredSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';
import { initializeProjection } from '@dxos/react-ui-table';
import { DataType, ProjectionManager } from '@dxos/schema';

import { TABLE_PLUGIN } from '../meta';
import { TableAction, TableView } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TableAction.Create,
      resolve: async ({ space, name, typename }) => {
        const { schema, projection } = await initializeProjection({ space, typename });
        const table = Obj.make(TableView, { name });
        const hasView = Relation.make(DataType.HasView, {
          // TODO(wittjosiah): Remove cast.
          [Relation.Source]: schema as unknown as StoredSchema,
          [Relation.Target]: table,
          projection: Ref.make(projection),
        });
        return { data: { object: table, relation: hasView } };
      },
    }),
    createResolver({
      intent: TableAction.AddRow,
      resolve: async ({ view, data }) => {
        const space = getSpace(view);
        invariant(space);
        invariant(view.projection.target?.query.typename);
        const schema = space.db.schemaRegistry.getSchema(view.projection.target.query.typename);
        invariant(schema);
        space.db.add(Obj.make(schema, data));
      },
    }),
    createResolver({
      intent: TableAction.DeleteColumn,
      resolve: ({ view, fieldId, deletionData }, undo) => {
        const space = getSpace(view);
        invariant(space);
        invariant(view.projection.target?.query.typename);
        const schema = space.db.schemaRegistry.getSchema(view.projection.target.query.typename);
        invariant(schema);
        const projection = new ProjectionManager(schema.jsonSchema, view.projection.target);
        if (!undo) {
          const { deleted, index } = projection.deleteFieldProjection(fieldId);
          return {
            undoable: {
              message: ['column deleted label', { ns: TABLE_PLUGIN }],
              data: { deletionData: { ...deleted, index } },
            },
          };
        } else if (undo && deletionData) {
          const { field, props, index } = deletionData;
          projection.setFieldProjection({ field, props }, index);
        }
      },
    }),
  ]);
