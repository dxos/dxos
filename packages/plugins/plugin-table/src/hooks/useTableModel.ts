//
// Copyright 2024 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { create } from '@dxos/echo-schema';
import { type EchoReactiveObject, getSpace } from '@dxos/react-client/echo';

import { TableModel } from '../model';
import { type TableType } from '../types';
import { createStarterSchema, createStarterView } from '../types';

export type UseTableModelParams = {
  table: TableType;
  objects: EchoReactiveObject<any>[];
  onCellUpdate: (cell: { col: number; row: number }) => void;
};

export const useTableModel = ({ table, objects, onCellUpdate }: UseTableModelParams): TableModel | undefined => {
  const space = getSpace(table);

  const onDeleteRow = useCallback(
    (row: any) => {
      return space?.db.remove(row);
    },
    [space],
  );

  useEffect(() => {
    if (space && !table.schema && !table.view) {
      table.schema = space.db.schema.addSchema(createStarterSchema());
      table.view = createStarterView();
      space.db.add(create(table.schema, {}));
    }
  }, [space, table.schema]);

  const [tableModel, setTableModel] = useState<TableModel>();

  useEffect(() => {
    if (!table) {
      return;
    }

    let tableModel: TableModel | undefined;
    const t = setTimeout(async () => {
      tableModel = new TableModel({ table, onDeleteRow, onCellUpdate });
      await tableModel.open();
      setTableModel(tableModel);
    });

    return () => {
      clearTimeout(t);
      void tableModel?.close();
    };
  }, [table, onCellUpdate, onDeleteRow]);

  useEffect(() => {
    tableModel?.updateData(objects);
  }, [objects, tableModel]);

  return tableModel;
};
