//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { type RefObject, useCallback, useEffect, useMemo } from 'react';

import { type DxGridElement, type DxGridAxisMeta } from '@dxos/react-ui-grid';

import { type TableEvent, type ColumnDefinition, createTable, updateTable } from '../table';

// TODO(Zan): Take ordering here (or order based on some stored property).
// When the order changes, we should notify the consumer.
export const useTable = (columnDefinitions: ColumnDefinition[], data: any[], gridRef: RefObject<DxGridElement>) => {
  const table = useMemo(() => createTable(columnDefinitions, data), [columnDefinitions, data]);

  const dispatch = useCallback((event: TableEvent) => {
    updateTable(table, event);
  }, []);

  const columnMeta: DxGridAxisMeta = useMemo(() => {
    return Object.fromEntries(
      table.columnDefinitions.map((col, index) => [index, { size: table.columnWidths[col.id] }]),
    );
  }, [table.columnDefinitions, table.columnWidths]);

  useEffect(() => {
    return effect(() => {
      if (!gridRef.current) {
        return;
      }

      for (const cellKey of table.__cellUpdateTracker.updatedCells.value) {
        const [col, row] = cellKey.split(',');
        const didUpdate = gridRef.current.updateIfWithinBounds({
          col: Number.parseInt(col),
          row: Number.parseInt(row),
        });

        if (didUpdate) {
          table.__cellUpdateTracker.clearUpdates();
          return;
        }
      }
    });
  }, [table.__cellUpdateTracker.updatedCells]);

  // Clean up table on unmount.
  useEffect(() => () => table.dispose(), []);

  return { table, columnMeta, dispatch };
};
