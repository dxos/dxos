//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React, { useCallback, useRef, useState, type MouseEvent } from 'react';

import { type DxGridElement, type DxAxisResize, Grid } from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';

import { ColumnActionsMenu } from './ColumnActionsMenu';
import { TableCellEditor } from './TableCellEditor';
import { useTableModel } from '../../hooks';
import { columnSettingsButtonAttr } from '../../model';
import { type GridCell, type TableType } from '../../types';

// NOTE(Zan): These fragments add border to inline-end and block-end of the grid using pseudo-elements.
// These are offset by 1px to avoid double borders in planks.
const inlineEndLine =
  '[&>.dx-grid]:relative [&>.dx-grid]:after:absolute [&>.dx-grid]:after:inset-block-0 [&>.dx-grid]:after:-inline-end-px [&>.dx-grid]:after:is-px [&>.dx-grid]:after:bg-separator';
const blockEndLine =
  '[&>.dx-grid]:before:absolute [&>.dx-grid]:before:inset-inline-0 [&>.dx-grid]:before:-block-end-px [&>.dx-grid]:before:bs-px [&>.dx-grid]:before:bg-separator';

const frozen = { frozenRowsStart: 1 };

export type TableProps = {
  table: TableType;
  data: any[];
};

// TODO(burdon): Move to react-ui-table?
export const Table = ({ table, data }: TableProps) => {
  const gridRef = useRef<DxGridElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [clickedColumnId, setClickedColumnId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
    const closestButton = (event.target as HTMLButtonElement).closest(`button[${columnSettingsButtonAttr}]`);
    if (closestButton) {
      triggerRef.current = closestButton as HTMLButtonElement;
      setClickedColumnId(closestButton.getAttribute(columnSettingsButtonAttr));
      setMenuOpen(true);
    }
  }, []);

  return (
    <ModalPrimitive.Root>
      <Grid.Root id='table-next'>
        <TableCellEditor tableModel={tableModel} gridRef={gridRef} />
        <Grid.Content
          ref={gridRef}
          limitRows={data.length}
          limitColumns={table.view?.fields?.length ?? 0}
          initialCells={tableModel?.cells.value}
          columns={tableModel?.columnMeta.value}
          frozen={frozen}
          onAxisResize={handleAxisResize}
          onClick={handleClick}
          className={mx(
            '[&>.dx-grid]:min-bs-0 [&>.dx-grid]:bs-full [&>.dx-grid]:max-bs-max [--dx-grid-base:var(--surface-bg)]',
            inlineEndLine,
            blockEndLine,
          )}
        />
      </Grid.Root>
      <ModalPrimitive.Anchor virtualRef={triggerRef} />
      <ColumnActionsMenu
        tableModel={tableModel}
        columnId={clickedColumnId}
        open={menuOpen}
        onOpenChange={setMenuOpen}
      />
    </ModalPrimitive.Root>
  );
};
