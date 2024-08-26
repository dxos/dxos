//
// Copyright 2023 DXOS.org
//

import { useFocusableGroup } from '@fluentui/react-tabster';
import { type Cell as CellType, type RowData } from '@tanstack/react-table';
import React, { useCallback, type PropsWithChildren } from 'react';

import { tdRoot } from '../../theme';
import { useTableContext } from '../Table/TableContext';

type CellProps<TData extends RowData, TValue> = PropsWithChildren<{
  cell: CellType<TData, TValue>;
}>;

const CELL_NAME = 'Cell';

const FocusableCell = <TData extends RowData, TValue>({ cell, children }: CellProps<TData, TValue>) => {
  const tableContext = useTableContext();
  const domAttributes = useFocusableGroup({ tabBehavior: 'limited' });
  const className = tdRoot(tableContext, cell.column.columnDef.meta?.cell?.classNames);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTableCellElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    const currentCell = event.currentTarget;
    const currentRow = currentCell.closest('tr');
    if (!currentRow) {
      return;
    }

    const cellIndex = Array.from(currentRow.cells || []).indexOf(currentCell);

    const focusNextCell = (nextRow: HTMLTableRowElement) => {
      const nextCell = nextRow.cells[cellIndex];
      nextCell.focus();
    };

    const nextSibling = currentRow.nextElementSibling;
    if (nextSibling instanceof HTMLTableRowElement) {
      focusNextCell(nextSibling);
    } else {
      // Poll for the new 'add row' row to be added to the DOM.
      const pollForNewRow = () => {
        const newNextSibling = currentRow.nextElementSibling;
        if (newNextSibling instanceof HTMLTableRowElement) {
          focusNextCell(newNextSibling);
        } else {
          requestAnimationFrame(pollForNewRow);
        }
      };
      requestAnimationFrame(pollForNewRow);
    }
  }, []);

  return (
    <td tabIndex={0} {...domAttributes} className={className} onKeyDown={handleKeyDown}>
      {children}
    </td>
  );
};

const StaticCell = <TData extends RowData, TValue>({ cell, children }: CellProps<TData, TValue>) => {
  const tableContext = useTableContext();
  return <td className={tdRoot(tableContext, cell.column.columnDef.meta?.cell?.classNames)}>{children}</td>;
};

const Cell = <TData extends RowData, TValue>({ cell, children }: CellProps<TData, TValue>) => {
  const { isGrid } = useTableContext();
  const Root = isGrid ? FocusableCell : StaticCell;
  return <Root cell={cell}>{children}</Root>;
};

Cell.displayName = CELL_NAME;

export { Cell };

export type { CellProps };
