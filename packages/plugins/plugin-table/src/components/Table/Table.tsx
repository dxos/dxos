//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React, { useCallback, useEffect, useRef } from 'react';

import { type DxGridElement, type DxAxisResize, Grid } from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';

import { ColumnActionsMenu } from './ColumnActionsMenu';
import { NewColumnForm } from './NewColumnForm';
import { RowActionsMenu } from './RowActionsMenu';
import { TableCellEditor } from './TableCellEditor';
import { useTableMenuController } from '../../hooks';
import { type TableModel } from '../../model';
import { type GridCell } from '../../types';

// NOTE(Zan): These fragments add border to inline-end and block-end of the grid using pseudo-elements.
// These are offset by 1px to avoid double borders in planks.
const inlineEndLine =
  '[&>.dx-grid]:relative [&>.dx-grid]:after:absolute [&>.dx-grid]:after:inset-block-0 [&>.dx-grid]:after:-inline-end-px [&>.dx-grid]:after:is-px [&>.dx-grid]:after:bg-separator';
const blockEndLine =
  '[&>.dx-grid]:before:absolute [&>.dx-grid]:before:inset-inline-0 [&>.dx-grid]:before:-block-end-px [&>.dx-grid]:before:bs-px [&>.dx-grid]:before:bg-separator';

const frozen = { frozenRowsStart: 1, frozenColsEnd: 1 };

export type TableProps = { model?: TableModel; onDeleteRow?: (row: any) => void };

export const Table = ({ model }: TableProps) => {
  const gridRef = useRef<DxGridElement>(null);

  const handleOnCellUpdate = useCallback((cell: GridCell) => {
    gridRef.current?.updateIfWithinBounds(cell);
  }, []);

  useEffect(() => {
    if (model) {
      model.setOnCellUpdate(handleOnCellUpdate);
    }
  }, [model, handleOnCellUpdate]);

  const handleAxisResize = useCallback(
    (event: DxAxisResize) => {
      if (event.axis === 'col') {
        const columnIndex = parseInt(event.index, 10);
        model?.setColumnWidth(columnIndex, event.size);
      }
    },
    [model],
  );

  const { state: menuState, triggerRef, handleClick, close } = useTableMenuController();

  return (
    <ModalPrimitive.Root>
      {/* TODO(burdon): Is this required to be unique? */}
      <Grid.Root id='table-next'>
        <TableCellEditor tableModel={model} gridRef={gridRef} />
        <Grid.Content
          ref={gridRef}
          className={mx(
            '[&>.dx-grid]:min-bs-0 [&>.dx-grid]:bs-full [&>.dx-grid]:max-bs-max [--dx-grid-base:var(--surface-bg)]',
            inlineEndLine,
            blockEndLine,
          )}
          initialCells={model?.cells.value}
          columns={model?.columnMeta.value}
          frozen={frozen}
          limitRows={model?.getRowCount() ?? 0}
          limitColumns={model?.table.view?.fields?.length ?? 0}
          onAxisResize={handleAxisResize}
          onClick={handleClick}
        />
      </Grid.Root>
      <ModalPrimitive.Anchor virtualRef={triggerRef} />
      <ColumnActionsMenu
        model={model}
        columnId={menuState?.type === 'column' ? menuState.columnId : null}
        open={menuState?.type === 'column'}
        onOpenChange={close}
      />
      <RowActionsMenu
        model={model}
        rowIndex={menuState?.type === 'row' ? menuState.rowIndex : null}
        open={menuState?.type === 'row'}
        onOpenChange={close}
      />
      <NewColumnForm model={model} open={menuState?.type === 'newColumn'} onClose={close} />
    </ModalPrimitive.Root>
  );
};
