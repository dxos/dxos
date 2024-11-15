//
// Copyright 2024 DXOS.org
//

import { type SortDirection, type Column, type ColumnSort } from '@tanstack/react-table';
import { useState } from 'react';

import { useTableContext } from '../components/Table/TableContext';

export const useColumnSorting = () => {
  const [columnSorting, setColumnSorting] = useState<ColumnSort[]>([]);

  const sortColumn = (columnId: string, sortDirection: SortDirection) => {
    setColumnSorting([{ id: columnId, desc: sortDirection === 'desc' }]);
  };

  const clearColumnSorting = () => {
    setColumnSorting([]);
  };

  return { sorting: columnSorting, sortColumn, clearColumnSorting };
};

export type ColumnSorting = ReturnType<typeof useColumnSorting>;

export const useSortColumn = (column: Column<any>) => {
  const { sorting, sortColumn, clearColumnSorting } = useTableContext();
  const [initialSortDirection, setInitialSortDirection] = useState<SortDirection | undefined>();

  const columnSort = sorting.find((s) => s.id === column.id);
  const sortDirection = columnSort ? (columnSort.desc ? ('desc' as const) : ('asc' as const)) : undefined;

  const canSort = column.getCanSort();

  const updateColumnSort = (direction: SortDirection) => {
    sortColumn(column.id, direction);
  };

  // Whichever sort is explicitly set first, will be the first sort direction
  // When toggling, we always go to the other direction, and then to unsorted.
  const onToggleSort = () => {
    if (sortDirection === undefined) {
      return;
    }

    if (sortDirection === initialSortDirection) {
      updateColumnSort(initialSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      clearColumnSorting();
    }
  };

  const onSelectSort = (direction: SortDirection) => {
    clearColumnSorting();
    setInitialSortDirection(direction);
    updateColumnSort(direction);
  };

  const onClearSort = () => {
    clearColumnSorting();
  };

  return { canSort, sortDirection, onSelectSort, onToggleSort, onClearSort };
};
