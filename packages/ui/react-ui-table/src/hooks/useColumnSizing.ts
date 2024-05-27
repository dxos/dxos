//
// Copyright 2024 DXOS.org
//
import { type ColumnSizingInfoState, type ColumnSizingState } from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';

import { useOnTransition } from '@dxos/react-ui';

import { type TableColumnDef } from '../components/Table';

export const useColumnResizing = ({
  columns,
  onColumnResize,
}: {
  columns: TableColumnDef<any>[];
  onColumnResize: ((state: Record<string, number>) => void) | undefined;
}) => {
  const [columnsInitialised, setColumnsInitialised] = useState(false);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  useEffect(() => {
    if (columnsInitialised) {
      return;
    }

    setColumnSizing(
      columns
        .filter((column) => !!column.size && (column as any).prop !== undefined)
        .reduce<ColumnSizingState>((state, column) => {
          state[(column as any).prop] = column.size!;
          return state;
        }, {}),
    );

    setColumnsInitialised(true);
  }, [columns, setColumnSizing]);

  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>({} as ColumnSizingInfoState);

  // Notify on column resize.
  const notifyColumnResize = useCallback(() => onColumnResize?.(columnSizing), [onColumnResize, columnSizing]);
  useOnTransition(columnSizingInfo.isResizingColumn, (v) => typeof v === 'string', false, notifyColumnResize);

  return { columnSizing, columnSizingInfo, setColumnSizing, setColumnSizingInfo };
};
