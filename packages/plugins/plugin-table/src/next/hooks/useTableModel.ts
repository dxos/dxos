//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type TableType } from '../../types';
import { TableModel } from '../table-model';

export const useTableModel = (table: TableType, data: any[], onCellUpdate: (col: number, row: number) => void) => {
  const [tableModel, setTableModel] = useState<TableModel>();

  useEffect(() => {
    if (!table || !data) {
      return;
    }

    let model: TableModel | undefined;
    const t = setTimeout(async () => {
      model = new TableModel({
        table,
        data,
        onCellUpdate,
      });
      await model.open();
      setTableModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.close();
    };
  }, [data, table, onCellUpdate]);

  return { tableModel };
};
