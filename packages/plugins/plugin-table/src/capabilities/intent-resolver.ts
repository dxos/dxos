//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver, type PluginContext } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';
import { ClientCapabilities } from '@dxos/plugin-client';
import { getSpace } from '@dxos/react-client/echo';
import { initializeTable, TableType } from '@dxos/react-ui-table';
import { ViewProjection } from '@dxos/schema';

import { TABLE_PLUGIN } from '../meta';
import { TableAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TableAction.Create,
      resolve: async ({ space, name, typename }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const table = live(TableType, { name, threads: [] });
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
        space.db.add(live(schema, data));
      },
    }),
    createResolver({
      intent: TableAction.DeleteColumn,
      resolve: ({ table, fieldId, deletionData }, undo) => {
        invariant(table.view);
        const schema = getSpace(table)?.db.schemaRegistry.getSchema(table.view.target!.query.typename!);
        invariant(schema);
        const projection = new ViewProjection(schema.jsonSchema, table.view.target!);
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
