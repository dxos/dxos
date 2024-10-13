//
// Copyright 2024 DXOS.org
//

import { type RefObject, useEffect, useState } from 'react';

import { type DxGridElement } from '@dxos/react-ui-grid';

import { type TableType } from '../../types';
import { TableModel } from '../table-model';

export const useTableModel = (table: TableType, data: any[], gridRef: RefObject<DxGridElement>) => {
  const [tableModel, setTableModel] = useState<TableModel>();

  useEffect(() => {
    if (!table || !data) {
      return;
    }

    const onCellUpdate = (col: number, row: number) => {
      gridRef.current?.updateIfWithinBounds({ col, row });
    };

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
  }, [data, table, gridRef]);

  return { tableModel };
};
