//
// Copyright 2024 DXOS.org
//

import { type RefObject, useEffect, useMemo, useState } from 'react';

import { type DxGridElement, type DxGridAxisMeta } from '@dxos/react-ui-grid';

import { type ColumnDefinition, TableModel } from '../table-model';

// TODO(Zan): Take ordering here (or order based on some stored property).
// When the order changes, we should notify the consumer.
export const useTableModel = (
  columnDefinitions: ColumnDefinition[],
  data: any[],
  gridRef: RefObject<DxGridElement>,
) => {
  const [tableModel, setTableModel] = useState<TableModel>();

  useEffect(() => {
    if (!columnDefinitions || !data) {
      return;
    }

    const onCellUpdate = (col: number, row: number) => {
      gridRef.current?.updateIfWithinBounds({ col, row });
    };

    let model: TableModel | undefined;
    const t = setTimeout(async () => {
      model = new TableModel(columnDefinitions, data, onCellUpdate);
      await model.open();
      setTableModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.close();
    };
  }, [columnDefinitions, data]);

  const columnMeta: DxGridAxisMeta = useMemo(() => {
    if (!tableModel) {
      return { grid: {} };
    }
    const headings = Object.fromEntries(
      tableModel.columnDefinitions.map((col, index) => [
        index,
        { size: tableModel.columnWidths[col.id], resizeable: true },
      ]),
    );

    return { grid: headings };
  }, [tableModel]);

  return { tableModel, columnMeta };
};
