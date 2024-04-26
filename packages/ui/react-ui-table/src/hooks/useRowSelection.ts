//
// Copyright 2024 DXOS.org
//
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { type OnChangeFn, type RowSelectionState } from '@tanstack/react-table';
import { useCallback } from 'react';

import { type TableProps } from '../components/Table';

export const useRowSelection = (
  props: Pick<
    TableProps<any>,
    'rowsSelectable' | 'defaultRowSelection' | 'rowSelection' | 'onRowSelectionChange' | 'rowsSelectable'
  >,
) => {
  const [rowSelection = {}, setRowSelection] = useControllableState({
    prop: props.rowSelection,
    onChange: props.onRowSelectionChange,
    defaultProp: props.defaultRowSelection,
  });

  // TODO(thure): Does @tanstack/react-table really need this intervention? It did seem necessary to enforce single-selection...
  const handleRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
    (updaterOrValue) => {
      const nextRowSelection = typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection) : updaterOrValue;
      if (props.rowsSelectable === 'multi') {
        setRowSelection(nextRowSelection);
      } else if (props.rowsSelectable) {
        const nextRowSelectionKey = Object.keys(nextRowSelection).filter((id) => !rowSelection[id])[0];
        setRowSelection(nextRowSelectionKey ? { [nextRowSelectionKey]: true } : {});
      } else {
        setRowSelection({});
      }
    },
    [props.rowsSelectable, setRowSelection, rowSelection],
  );

  return { rowSelection, handleRowSelectionChange };
};
