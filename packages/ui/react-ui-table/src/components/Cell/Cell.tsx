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
  const className = tdRoot(tableContext, cell.column.columnDef.meta?.cell?.classNames);

  const handleKeyDown = useCallback(({ key, currentTarget }: KeyboardEvent<HTMLTableCellElement>) => {
    if (key !== 'Enter') {
      return;
    }

    const currentRow = currentTarget.closest('tr');
    if (!currentRow) {
      return;
    }

    const cellIndex = Array.from(currentRow.cells || []).indexOf(currentTarget);

    const focusNextCell = (nextRow: HTMLTableRowElement) => {
      const nextCell = nextRow.cells[cellIndex];
      nextCell.focus();
    };

    const nextSibling = currentRow.nextElementSibling;
    if (nextSibling instanceof HTMLTableRowElement) {
      focusNextCell(nextSibling);
    } else {
      let depth = 0;
      // Poll for the new 'add row' row to be added to the DOM.
      const pollForNewRow = () => {
        const newNextSibling = currentRow.nextElementSibling;
        if (newNextSibling instanceof HTMLTableRowElement) {
          focusNextCell(newNextSibling);
        } else if (depth++ < 100) {
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
