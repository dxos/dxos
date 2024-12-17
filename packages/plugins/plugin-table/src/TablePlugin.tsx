//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition, createSurface, createIntent, createResolver } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';
import { getSpace, type Space } from '@dxos/react-client/echo';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { TableType, initializeTable, translations as tableTranslations } from '@dxos/react-ui-table';
import { ViewProjection, ViewType } from '@dxos/schema';

import { TableContainer, TableViewEditor } from './components';
import meta, { TABLE_PLUGIN } from './meta';
import { serializer } from './serializer';
import translations from './translations';
import { TableAction, type TablePluginProvides } from './types';

export const TablePlugin = (): PluginDefinition<TablePluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [TableType.typename]: {
            createObject: (props: { name?: string; space: Space }) => createIntent(TableAction.Create, props),
            label: (object: any) => (object instanceof TableType ? object.name : undefined),
            placeholder: ['object placeholder', { ns: TABLE_PLUGIN }],
            icon: 'ph--table--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (table: TableType) => [], // loadObjectReferences(table, (table) => [table.schema]),
            serializer,
          },
        },
      },
      translations: [...translations, ...formTranslations, ...tableTranslations],
      echo: {
        schema: [TableType],
        system: [ViewType],
      },
      surface: {
        definitions: () => [
          createSurface({
            id: `${TABLE_PLUGIN}/table`,
            role: ['article', 'section', 'slide'],
            filter: (data): data is { subject: TableType } => data.subject instanceof TableType,
            component: ({ data, role }) => <TableContainer table={data.subject} role={role} />,
          }),
          createSurface({
            id: `${TABLE_PLUGIN}/settings-panel`,
            role: 'complementary--settings',
            filter: (data): data is { subject: TableType } => data.subject instanceof TableType,
            component: ({ data }) => <TableViewEditor table={data.subject} />,
          }),
        ],
      },
      intent: {
        resolvers: () => [
          createResolver(TableAction.Create, ({ space, name }) => {
            const table = create(TableType, { name, threads: [] });
            initializeTable({ space, table });
            return { data: { object: table } };
          }),
          createResolver(TableAction.DeleteColumn, ({ table, fieldId, deletionData }, undo) => {
            invariant(table.view);

            const schema = getSpace(table)?.db.schemaRegistry.getSchema(table.view.query.type);
            invariant(schema);
            const projection = new ViewProjection(schema, table.view);

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
        ],
      },
    },
  };
};
