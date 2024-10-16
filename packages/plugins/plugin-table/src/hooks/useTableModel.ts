//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { TableModel } from '../table-model';
import { type TableType } from '../types';

// TODO(burdon): Create TableModel interface and useTableModel hook that manages query.
export const useTableModel = (
  table: TableType,
  data: any[],
  onCellUpdate: (col: number, row: number) => void,
): TableModel | undefined => {
  const [tableModel, setTableModel] = useState<TableModel>();
  useEffect(() => {
    if (!table || !data) {
      return;
    }

    let tableModel: TableModel | undefined;
    const t = setTimeout(async () => {
      tableModel = new TableModel({ table, data, onCellUpdate });
      await tableModel.open();
      setTableModel(tableModel);
    });

    return () => {
      clearTimeout(t);
      void tableModel?.close();
    };
  }, [data, table, onCellUpdate]);

  return tableModel;
};
