//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { type DxGridElement, type DxAxisResize, Grid, type GridContentProps, closestCell } from '@dxos/react-ui-grid';
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

//
// Root
//

export type TableRootProps = PropsWithChildren<{ role?: string }>;

const TableRoot = ({ role = 'article', children }: TableRootProps) => {
  // TODO(burdon): article | section | slide shouldn't be handled here; move into framework.
  return (
    <div
      role={role}
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

//
// Main
//

export type TableMainProps = {
  model?: TableModel;
  onAddRow?: (row: number) => void;
  onDeleteRow?: (row: number) => void;
};

const TableMain = ({ model, onAddRow, onDeleteRow }: TableMainProps) => {
  const gridRef = useRef<DxGridElement>(null);

  // TODO(burdon): Consider moving this upstream via imperative handle.
  //  (So that all callbacks passed to the model are passed into the constructor/hook).
  const handleCellUpdate = useCallback((cell: GridCell) => {
    gridRef.current?.updateIfWithinBounds(cell);
  }, []);

  const handleRowOrderChanged = useCallback(() => {
    gridRef.current?.updateCells(true);
  }, []);

  const handleKeyDown = useCallback<NonNullable<GridContentProps['onKeyDown']>>(
    (event) => {
      const cell = closestCell(event.target);
      if (!model || !cell) {
        return;
      }

      switch (event.key) {
        case 'Backspace':
        case 'Delete': {
          model.setCellData(cell, undefined);
          break;
        }
      }
    },
    [model],
  );

  const handleEnter = useCallback<NonNullable<TableCellEditor['onEnter']>>(
    (cell) => {
      // TODO(burdon): Insert row onl if bottom row isn't completely blank already.
      if (model && cell.row === model.getRowCount() - 1) {
        onAddRow?.(cell.row);
      }
    },
    [model],
  );

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

  // TODO(burdon): Import types.
  const handleFocus = (increment: 'col' | 'row' | undefined, delta: 0 | 1 | -1 | undefined) =>
    gridRef.current?.refocus(increment, delta);

  const { state: menuState, triggerRef, handleClick, close, showColumnSettings } = useTableMenuController();

  return (
    <>
      {/* TODO(burdon): Is this required to be unique? */}
      <Grid.Root id={model?.table.id ?? 'table-grid'}>
        <TableCellEditor model={model} onFocus={handleFocus} onEnter={handleEnter} />
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
          onKeyDown={handleKeyDown}
        />
      </Grid.Root>
      <ColumnActionsMenu
        model={model}
        fieldId={menuState?.type === 'column' ? menuState.fieldId : undefined}
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
        fieldId={menuState?.type === 'columnSettings' ? menuState.fieldId : undefined}
        onOpenChange={close}
        triggerRef={triggerRef}
      />
    </>
  );
};

export const Table = {
  Root: TableRoot,
  Main: TableMain,
};
