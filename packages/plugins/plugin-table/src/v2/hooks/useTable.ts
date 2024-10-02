//
// Copyright 2024 DXOS.org
//

import { useMemo } from 'react';

import { create } from '@dxos/echo-schema';

import { type TableEvent, type ColumnDefinition, createTable, updateTable } from '../table';

// TODO(Zan): Take ordering here (or order based on some stored property).
// When the order changes, we should notify the consumer.
export const useTable = (columnDefinitions: ColumnDefinition[], data: any[]) => {
  let table = useMemo(() => createTable(columnDefinitions, data), [columnDefinitions]);

  const dispatch = (event: TableEvent) => {
    // TODO(Zan): When we switch to signia-react, we can use Incrementally computed signals
    table = create(updateTable(table, event));
  };

  return { table, dispatch };
};
