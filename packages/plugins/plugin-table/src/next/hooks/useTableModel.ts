//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
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

    let model: TableModel | undefined;
    const t = setTimeout(async () => {
      model = new TableModel(columnDefinitions, data);
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

  // TODO(Zan): Table should take a callback like onCellUpdated. Move this effect into TableModel
  useEffect(() => {
    if (!tableModel || !gridRef.current) {
      return;
    }

    return effect(() => {
      if (!gridRef.current || !tableModel.cellUpdateListener) {
        return;
      }

      for (const cellKey of tableModel.cellUpdateListener.updatedCells.value) {
        const [col, row] = cellKey.split(',');
        const didUpdate = gridRef.current.updateIfWithinBounds({
          col: Number.parseInt(col),
          row: Number.parseInt(row),
        });

        if (didUpdate) {
          tableModel.cellUpdateListener.clearUpdates();
          return;
        }
      }
    });
  }, [tableModel, gridRef]);

  return { tableModel, columnMeta };
};
