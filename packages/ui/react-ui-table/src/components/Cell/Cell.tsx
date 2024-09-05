//
// Copyright 2023 DXOS.org
//

import { useFocusableGroup } from '@fluentui/react-tabster';
import { type Cell as CellType, type RowData } from '@tanstack/react-table';
import React, { useCallback, type PropsWithChildren, type KeyboardEvent } from 'react';

import { tdRoot } from '../../theme';
import { useTableContext } from '../Table/TableContext';

type CellProps<TData extends RowData, TValue> = PropsWithChildren<{
  cell: CellType<TData, TValue>;
}>;

const CELL_NAME = 'Cell';

const FocusableCell = <TData extends RowData, TValue>({ cell, children }: CellProps<TData, TValue>) => {
  const tableContext = useTableContext();
  const domAttributes = useFocusableGroup({ tabBehavior: 'limited' });

  const pinned = tableContext.table.getState().rowPinning?.bottom?.includes(cell.row.id);
  const className = tdRoot({ ...tableContext, pinned }, cell.column.columnDef.meta?.cell?.classNames);

  const handleKeyDown = useCallback(({ key, currentTarget }: KeyboardEvent<HTMLTableCellElement>) => {
    if (key !== 'Enter') {
      return;
    }

    const currentRow = currentTarget.closest('tr');
    if (!currentRow) {
      return;
    }

    const cellIndex = Array.from(currentRow.cells || []).indexOf(currentTarget);

    const nextSibling = currentRow.nextElementSibling;
    if (!(nextSibling instanceof HTMLTableRowElement)) {
      let depth = 0;
      // Poll for the new 'add row' row to be added to the DOM.
      const pollForNewRow = () => {
        const newNextSibling = currentRow.nextElementSibling;
        if (newNextSibling instanceof HTMLTableRowElement) {
          const nextCell = newNextSibling.cells[cellIndex];
          // Find the input within next cell and focus it.
          const input = nextCell.querySelector('input');
          if (input) {
            input.focus();
          }

          // TODO(Zan): Use the same utility that sheets uses.
          // Scroll current row into view after it's been hidden behind the sticky add-row row.
          currentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (depth++ < 100) {
          requestAnimationFrame(pollForNewRow);
        }
      };
      requestAnimationFrame(pollForNewRow);
    }
  }, []);

  return (
    <td data-testid='table.cell' tabIndex={0} {...domAttributes} className={className} onKeyDown={handleKeyDown}>
      {children}
    </td>
  );
};

const StaticCell = <TData extends RowData, TValue>({ cell, children }: CellProps<TData, TValue>) => {
  const tableContext = useTableContext();
  return (
    <td data-testid='table.cell' className={tdRoot(tableContext, cell.column.columnDef.meta?.cell?.classNames)}>
      {children}
    </td>
  );
};

const Cell = <TData extends RowData, TValue>({ cell, children }: CellProps<TData, TValue>) => {
  const { isGrid } = useTableContext();
  const Root = isGrid ? FocusableCell : StaticCell;
  return <Root cell={cell}>{children}</Root>;
};

Cell.displayName = CELL_NAME;

export { Cell };

export type { CellProps };
