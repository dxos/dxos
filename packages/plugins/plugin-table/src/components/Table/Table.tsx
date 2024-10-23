//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React, { useCallback, useRef, useState, type MouseEvent } from 'react';

import { type DxGridElement, type DxAxisResize, Grid } from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';

import { ColumnActionsMenu } from './ColumnActionsMenu';
import { RowActionsMenu } from './RowActionsMenu';
import { TableCellEditor } from './TableCellEditor';
import { useTableModel } from '../../hooks';
import { columnSettingsButtonAttr, rowMenuButtonAttr } from '../../model';
import { type GridCell, type TableType } from '../../types';

// NOTE(Zan): These fragments add border to inline-end and block-end of the grid using pseudo-elements.
// These are offset by 1px to avoid double borders in planks.
const inlineEndLine =
  '[&>.dx-grid]:relative [&>.dx-grid]:after:absolute [&>.dx-grid]:after:inset-block-0 [&>.dx-grid]:after:-inline-end-px [&>.dx-grid]:after:is-px [&>.dx-grid]:after:bg-separator';
const blockEndLine =
  '[&>.dx-grid]:before:absolute [&>.dx-grid]:before:inset-inline-0 [&>.dx-grid]:before:-block-end-px [&>.dx-grid]:before:bs-px [&>.dx-grid]:before:bg-separator';

const frozen = { frozenRowsStart: 1, frozenColsEnd: 1 };

export type TableProps = {
  table: TableType;
  data: any[];
};

// TODO(burdon): Move to react-ui-table?
export const Table = ({ table, data }: TableProps) => {
  const gridRef = useRef<DxGridElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [clickedColumnId, setClickedColumnId] = useState<string | null>(null);
  const [clickedRowIndex, setClickedRowIndex] = useState<number | null>(null);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [rowMenuOpen, setRowMenuOpen] = useState(false);

  const handleOnCellUpdate = useCallback((cell: GridCell) => {
    gridRef.current?.updateIfWithinBounds(cell);
  }, []);

  const tableModel = useTableModel(table, data, handleOnCellUpdate);

  const handleAxisResize = useCallback(
    (event: DxAxisResize) => {
      if (event.axis === 'col') {
        const columnIndex = parseInt(event.index, 10);
        tableModel?.setColumnWidth(columnIndex, event.size);
      }
    },
    [tableModel],
  );

  const handleClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const closestColumnButton = target.closest(`button[${columnSettingsButtonAttr}]`);
    const closestRowButton = target.closest(`button[${rowMenuButtonAttr}]`);

    if (closestColumnButton) {
      triggerRef.current = closestColumnButton as HTMLButtonElement;
      setClickedColumnId(closestColumnButton.getAttribute(columnSettingsButtonAttr));
      setColumnMenuOpen(true);
      setRowMenuOpen(false);
    } else if (closestRowButton) {
      triggerRef.current = closestRowButton as HTMLButtonElement;
      setClickedRowIndex(Number(closestRowButton.getAttribute(rowMenuButtonAttr)));
      setRowMenuOpen(true);
      setColumnMenuOpen(false);
    }
  }, []);

  return (
    <ModalPrimitive.Root>
      {/* TODO(burdon): Is this required to be unique? */}
      <Grid.Root id='table-next'>
        <TableCellEditor tableModel={tableModel} gridRef={gridRef} />
        <Grid.Content
          ref={gridRef}
          className={mx(
            '[&>.dx-grid]:min-bs-0 [&>.dx-grid]:bs-full [&>.dx-grid]:max-bs-max [--dx-grid-base:var(--surface-bg)]',
            inlineEndLine,
            blockEndLine,
          )}
          initialCells={tableModel?.cells.value}
          columns={tableModel?.columnMeta.value}
          frozen={frozen}
          limitRows={data.length}
          limitColumns={table.view?.fields?.length ?? 0}
          onAxisResize={handleAxisResize}
          onClick={handleClick}
        />
      </Grid.Root>
      <ModalPrimitive.Anchor virtualRef={triggerRef} />
      <ColumnActionsMenu
        tableModel={tableModel}
        columnId={clickedColumnId}
        open={columnMenuOpen}
        onOpenChange={setColumnMenuOpen}
      />
      <RowActionsMenu
        tableModel={tableModel}
        rowIndex={clickedRowIndex}
        open={rowMenuOpen}
        onOpenChange={setRowMenuOpen}
      />
    </ModalPrimitive.Root>
  );
};
