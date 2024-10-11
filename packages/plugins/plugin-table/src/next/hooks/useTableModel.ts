//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { type RefObject, useEffect, useMemo } from 'react';

import { type DxGridElement, type DxGridAxisMeta } from '@dxos/react-ui-grid';

import { type ColumnDefinition, TableModel } from '../table-model';

// TODO(Zan): Take ordering here (or order based on some stored property).
// When the order changes, we should notify the consumer.
export const useTableModel = (
  columnDefinitions: ColumnDefinition[],
  data: any[],
  gridRef: RefObject<DxGridElement>,
) => {
  const tableModel = useMemo(() => new TableModel(columnDefinitions, data), [columnDefinitions, data]);

  const columnMeta: DxGridAxisMeta = useMemo(() => {
    const headings = Object.fromEntries(
      tableModel.columnDefinitions.map((col, index) => [
        index,
        { size: tableModel.columnWidths[col.id], resizeable: true },
      ]),
    );

    return { grid: headings };
  }, [tableModel.columnDefinitions, tableModel.columnWidths]);

  // TODO(Zan): Table should take a callback like onCellUpdated. Move this effect into TableModel
  useEffect(() => {
    return effect(() => {
      if (!gridRef.current) {
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
  }, [tableModel.cellUpdateListener.updatedCells]);

  // Clean up table on unmount.
  useEffect(() => () => tableModel.dispose(), []);

  return { tableModel, columnMeta };
};
