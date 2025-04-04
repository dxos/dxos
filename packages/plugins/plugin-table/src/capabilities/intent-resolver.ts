//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver, type PluginsContext } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';
import { ClientCapabilities } from '@dxos/plugin-client';
import { getSpace } from '@dxos/react-client/echo';
import { initializeTable, TableType } from '@dxos/react-ui-table';
import { ViewProjection } from '@dxos/schema';

import { TABLE_PLUGIN } from '../meta';
import { TableAction } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TableAction.Create,
      resolve: async ({ space, name, typename }) => {
        const client = context.requestCapability(ClientCapabilities.Client);
        const table = create(TableType, { name, threads: [] });
        await initializeTable({ client, space, table, typename });
        return { data: { object: table } };
      },
    }),
    createResolver({
      intent: TableAction.AddRow,
      resolve: async ({ table, data }) => {
        const space = getSpace(table);
        invariant(space);
        invariant(table.view?.target);
        const schema = space.db.schemaRegistry.getSchema(table.view.target.query.typename!);
        invariant(schema);
        space.db.add(create(schema, data));
      },
    }),
    createResolver({
      intent: TableAction.DeleteColumn,
      resolve: ({ table, fieldId, deletionData }, undo) => {
        invariant(table.view);
        const schema = getSpace(table)?.db.schemaRegistry.getSchema(table.view.target!.query.typename!);
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
      },
    }),
  ]);
