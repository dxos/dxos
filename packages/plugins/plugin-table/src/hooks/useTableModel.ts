//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { create } from '@dxos/echo-schema';
import { type EchoReactiveObject, getSpace } from '@dxos/react-client/echo';

import { TableModel, type TableModelProps } from '../model';
import { type TableType } from '../types';
import { createStarterSchema, createStarterView } from '../types';

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

  // TODO(ZaymonFC): Not sure this belongs here. Seek feeback.
  useEffect(() => {
    if (space && !table?.schema && !table.view) {
      table.schema = space.db.schema.addSchema(createStarterSchema());
      table.view = createStarterView(table.schema);
      space.db.add(create(table.schema, {}));
    }
  }, [space, table?.schema]);

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
