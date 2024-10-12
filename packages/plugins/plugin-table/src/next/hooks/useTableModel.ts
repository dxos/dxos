//
// Copyright 2024 DXOS.org
//

import { type RefObject, useEffect, useMemo, useState } from 'react';

import { type DxGridElement, type DxGridAxisMeta } from '@dxos/react-ui-grid';

import { type TableType } from '../../types';
import { TableModel } from '../table-model';

// TODO(Zan): Take ordering here (or order based on some stored property).
// When the order changes, we should notify the consumer.
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
      model = new TableModel(table, data, onCellUpdate);
      await model.open();
      setTableModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.close();
    };
  }, [data]);

  const columnMeta: DxGridAxisMeta = useMemo(() => {
    if (!tableModel) {
      return { grid: {} };
    }
    const headings = Object.fromEntries(
      tableModel.table.props.map((prop, index) => [
        index,
        { size: tableModel.columnWidths[prop.id!], resizeable: true },
      ]),
    );

    return { grid: headings };
  }, [tableModel]);

  // TODO(burdon): Just return model (columnMeta should be part of this?)
  return { tableModel, columnMeta };
};
