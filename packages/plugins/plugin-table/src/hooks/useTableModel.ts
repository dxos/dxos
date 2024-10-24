//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { TableModel } from '../model';
import { type TableType } from '../types';

export type UseTableModelParams = {
  table: TableType;
  data: any[];
  onCellUpdate: (cell: { col: number; row: number }) => void;
  onDeleteRow?: (row: any) => void;
};

// TODO(burdon): Create TableModel interface and useTableModel hook that manages query.
export const useTableModel = ({
  table,
  data,
  onCellUpdate,
  onDeleteRow,
}: UseTableModelParams): TableModel | undefined => {
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
  }, [table, onCellUpdate]);

  useEffect(() => {
    tableModel?.updateData(data);
  }, [data, tableModel]);

  return tableModel;
};
