//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React, { type PropsWithChildren, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { type DxGridElement, type DxAxisResize, Grid } from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';

import { ColumnActionsMenu } from './ColumnActionsMenu';
import { ColumnSettingsModal } from './ColumnSettingsModal';
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

const TablePrimitive = ({ model }: TableProps) => {
  const gridRef = useRef<DxGridElement>(null);

  const handleCellUpdate = useCallback((cell: GridCell) => {
    gridRef.current?.updateIfWithinBounds(cell);
  }, []);

  const handleRowOrderChanged = useCallback(() => {
    gridRef.current?.updateCells(true);
  }, []);

  useLayoutEffect(() => {
    if (!gridRef.current || !model) {
      return;
    }
    gridRef.current.getCells = model.getCells.bind(model);
  }, [model]);

  useEffect(() => {
    if (model) {
      model.setOnCellUpdate(handleCellUpdate);
      model.setOnRowOrderChange(handleRowOrderChanged);
    }
  }, [model, handleCellUpdate, handleRowOrderChanged]);

  const handleAxisResize = useCallback(
    (event: DxAxisResize) => {
      if (event.axis === 'col') {
        const columnIndex = parseInt(event.index, 10);
        model?.setColumnWidth(columnIndex, event.size);
      }
    },
    [model],
  );

  const { state: menuState, triggerRef, handleClick, close, showColumnSettings } = useTableMenuController();

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
          columns={model?.columnMeta.value}
          frozen={frozen}
          limitRows={model?.getRowCount() ?? 0}
          limitColumns={model?.table.view?.fields?.length ?? 0}
          onAxisResize={handleAxisResize}
          onClick={handleClick}
        />
      </Grid.Root>
      <ColumnActionsMenu
        model={model}
        columnId={menuState?.type === 'column' ? menuState.columnId : undefined}
        open={menuState?.type === 'column'}
        onOpenChange={close}
        onShowColumnSettings={showColumnSettings}
        triggerRef={triggerRef}
      />
      <RowActionsMenu
        model={model}
        rowIndex={menuState?.type === 'row' ? menuState.rowIndex : undefined}
        open={menuState?.type === 'row'}
        onOpenChange={close}
        triggerRef={triggerRef}
      />
      <NewColumnForm model={model} open={menuState?.type === 'newColumn'} onClose={close} triggerRef={triggerRef} />
      <ColumnSettingsModal
        model={model}
        open={menuState?.type === 'columnSettings'}
        columnId={menuState?.type === 'columnSettings' ? menuState.columnId : undefined}
        onOpenChange={close}
        triggerRef={triggerRef}
      />
    </ModalPrimitive.Root>
  );
};

const Viewport = ({ role = 'article', children }: PropsWithChildren<{ role?: string }>) => {
  return (
    <div
      className={mx(
        role === 'article' && 'relative is-full max-is-max min-is-0 min-bs-0',
        role === 'section' && 'grid cols-1 rows-[1fr_min-content] min-bs-0 !bg-[--surface-bg]',
        role === 'slide' && 'bs-full overflow-auto grid place-items-center',
      )}
    >
      {children}
    </div>
  );
};

export const Table = {
  Table: TablePrimitive,
  Viewport,
};
