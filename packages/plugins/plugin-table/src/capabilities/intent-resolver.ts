//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';
import { getSpace } from '@dxos/react-client/echo';
import { initializeTable, TableType } from '@dxos/react-ui-table';
import { ViewProjection } from '@dxos/schema';

import { TABLE_PLUGIN } from '../meta';
import { TableAction } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver(TableAction.Create, async ({ space, name, initialSchema }) => {
      const table = create(TableType, { name, threads: [] });
      await initializeTable({ space, table, initialSchema });
      return { data: { object: table } };
    }),
    createResolver(TableAction.AddRow, async ({ table, data }) => {
      const space = getSpace(table);
      invariant(space);
      invariant(table.view?.target);

      const schema = space.db.schemaRegistry.getSchema(table.view.target.query.type);
      invariant(schema);

      space.db.add(create(schema, data));
    }),
    createResolver(TableAction.DeleteColumn, ({ table, fieldId, deletionData }, undo) => {
      invariant(table.view);

      const schema = getSpace(table)?.db.schemaRegistry.getSchema(table.view.target!.query.type);
      invariant(schema);
      const projection = new ViewProjection(schema, table.view.target!);

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
    }),
  ]);
