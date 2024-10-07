//
// Copyright 2024 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { type TableEvent, type ColumnDefinition, createTable, updateTable } from '../table';

// TODO(Zan): Take ordering here (or order based on some stored property).
// When the order changes, we should notify the consumer.
export const useTable = (columnDefinitions: ColumnDefinition[], data: any[]) => {
  const table = useMemo(() => createTable(columnDefinitions, data), [columnDefinitions, data]);

  const dispatch = useCallback((event: TableEvent) => {
    updateTable(table, event);
  }, []);

  return { table, dispatch };
};
