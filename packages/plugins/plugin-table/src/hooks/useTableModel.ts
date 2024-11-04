//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { create, toJsonSchema, S, TypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { type EchoReactiveObject, getSpace } from '@dxos/react-client/echo';
import { createView } from '@dxos/schema';

import { TableModel, type TableModelProps } from '../model';
import { type TableType } from '../types';

export type UseTableModelParams = {
  table: TableType;
  objects: EchoReactiveObject<any>[];
} & Pick<TableModelProps, 'onAddColumn' | 'onDeleteColumn' | 'onDeleteRow'>;

export const useTableModel = ({
  table,
  objects,
  onAddColumn,
  onDeleteColumn,
  onDeleteRow,
}: UseTableModelParams): TableModel | undefined => {
  const space = getSpace(table);
  // TODO(burdon): Should be provided upstream?
  useEffect(() => {
    if (space && !table.view) {
      const schema = TypedObject({
        typename: 'example.com/type/' + PublicKey.random().toHex(),
        version: '0.1.0',
      })({
        name: S.optional(S.String),
        description: S.optional(S.String),
        quantity: S.optional(S.Number),
      });

      space.db.schemaRegistry.addSchema(schema);
      table.view = createView({
        typename: schema.typename,
        jsonSchema: toJsonSchema(schema),
      });
      space.db.add(create(schema, {}));
    }
  }, [space, table]);

  const [tableModel, setTableModel] = useState<TableModel>();
  useEffect(() => {
    if (!table) {
      return;
    }

    let tableModel: TableModel | undefined;
    const t = setTimeout(async () => {
      tableModel = new TableModel({ table, onAddColumn, onDeleteColumn, onDeleteRow });
      await tableModel.open();
      setTableModel(tableModel);
    });

    return () => {
      clearTimeout(t);
      void tableModel?.close();
    };
  }, [table, onAddColumn, onDeleteColumn, onDeleteRow]);

  useEffect(() => {
    tableModel?.updateData(objects);
  }, [objects, tableModel]);

  return tableModel;
};
