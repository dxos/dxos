//
// Copyright 2024 DXOS.org
//

import { type SortDirection, type Column } from '@tanstack/react-table';
import { useState } from 'react';

export const useColumnSorting = (column: Column<any>) => {
  const [sortDirection, setSortDirection] = useState<SortDirection | false>(column.getIsSorted());
  const [firstSort, setFirstSort] = useState<SortDirection | undefined>();

  const canSort = column.getCanSort();

  const updateColumnSort = (direction: SortDirection | false) => {
    setSortDirection(direction);

    switch (direction) {
      case false:
        column.clearSorting();
        break;
      case 'asc':
        column.toggleSorting(false); // descending false
        break;
      case 'desc':
        column.toggleSorting(true); // descending true
        break;
    }
  };

  // Whichever sort is explicitly set first, will be the first sort direction
  // When toggling, we always go to the other direction, and then to unsorted.
  const onToggleSort = () => {
    if (sortDirection === false) {
      return;
    }

    if (sortDirection === firstSort) {
      updateColumnSort(firstSort === 'asc' ? 'desc' : 'asc');
    } else {
      updateColumnSort(false);
    }
  };

  const onSelectSort = (direction: SortDirection) => {
    setFirstSort(direction);
    updateColumnSort(direction);
  };

  const onClearSort = () => {
    updateColumnSort(false);
  };

  return { canSort, sortDirection, onSelectSort, onToggleSort, onClearSort };
};
