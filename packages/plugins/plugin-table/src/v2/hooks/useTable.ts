//
// Copyright 2024 DXOS.org
//

import { useCallback, useState } from 'react';

import { create } from '@dxos/echo-schema';

import { type TableEvent, type ColumnDefinition, createTable, updateTable } from '../table';

// TODO(Zan): Take ordering here (or order based on some stored property).
// When the order changes, we should notify the consumer.
export const useTable = (columnDefinitions: ColumnDefinition[], data: any[]) => {
  const [table, setTable] = useState(() => createTable(columnDefinitions, data));

  const dispatch = useCallback((event: TableEvent) => {
    setTable((prevTable) => create(updateTable(prevTable, event)));
  }, []);

  return { table, dispatch };
};
