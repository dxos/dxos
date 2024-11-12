//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, type PropsWithChildren, useCallback, useImperativeHandle, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { Filter, getSpace } from '@dxos/react-client/echo';
import {
  type DxAxisResize,
  type DxGridElement,
  Grid,
  type GridContentProps,
  type GridScopedProps,
  closestCell,
  useGridContext,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { getValue } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { ColumnActionsMenu } from './ColumnActionsMenu';
import { ColumnSettings } from './ColumnSettings';
import { RowActionsMenu } from './RowActionsMenu';
import { useTableMenuController } from '../../hooks';
import { type TableModel } from '../../model';
import { type GridCell } from '../../types';
import { CellEditor, type CellEditorProps } from '../CellEditor';

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

export type TableController = {
  update?: (cell?: GridCell) => void;
};

export type TableMainProps = {
  model?: TableModel;
};

const TableMain = forwardRef<TableController, TableMainProps>(({ model }, forwardedRef) => {
  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);

  /**
   * Provides an external controller that can be called to repaint the table.
   */
  useImperativeHandle<TableController, TableController>(
    forwardedRef,
    () => {
      if (!model || !dxGrid) {
        return {};
      }

      dxGrid.getCells = model.getCells.bind(model);
      return {
        update: (cell) => {
          if (cell) {
            dxGrid.updateIfWithinBounds(cell);
          } else {
            dxGrid.updateCells(true);
          }
        },
      };
    },
    [model, dxGrid],
  );

  const handleFocus: TableCellEditorProps['onFocus'] = (increment, delta) => {
    dxGrid?.refocus(increment, delta);
  };

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

  const handleEnter = useCallback<NonNullable<TableCellEditorProps['onEnter']>>(
    (cell) => {
      // TODO(burdon): Insert row only if bottom row isn't completely blank already.
      if (model && cell.row === model.getRowCount() - 1) {
        model.insertRow(cell.row);
      }
    },
    [model],
  );

  const handleAxisResize = useCallback(
    (event: DxAxisResize) => {
      if (event.axis === 'col') {
        const columnIndex = parseInt(event.index, 10);
        model?.setColumnWidth(columnIndex, event.size);
      }
    },
    [model],
  );

  // TODO(burdon): Move to model?
  const handleComplete = useCallback<NonNullable<CellEditorProps['onComplete']>>(
    async ({ field, props }, _text) => {
      if (!model) {
        return [];
      }

      if (props.referenceSchema && field.referencePath) {
        const space = getSpace(model.table);
        invariant(space);
        const schema = space.db.schemaRegistry.getSchema(props.referenceSchema);
        if (schema) {
          const { objects } = await space.db.query(Filter.schema(schema)).run();
          return objects
            .map((obj) => {
              const value = getValue(obj, field.referencePath!);
              if (!value || typeof value !== 'string') {
                return undefined;
              }

              return {
                label: value,
                data: obj,
              };
            })
            .filter(isNotFalsy);
        }
      }

      return [];
    },
    [model],
  );

  const { state: menuState, triggerRef, handleClick, close, showColumnSettings } = useTableMenuController();

  return (
    <>
      {/* TODO(burdon): Is this required to be unique? */}
      <Grid.Root id={model?.table.id ?? 'table-grid'}>
        <TableCellEditor model={model} onEnter={handleEnter} onFocus={handleFocus} onComplete={handleComplete} />

        <Grid.Content
          className={mx(
            '[&>.dx-grid]:min-bs-0 [&>.dx-grid]:bs-full [&>.dx-grid]:max-bs-max [--dx-grid-base:var(--surface-bg)]',
            inlineEndLine,
            blockEndLine,
          )}
          frozen={frozen}
          columns={model?.columnMeta.value}
          limitRows={model?.getRowCount() ?? 0}
          limitColumns={model?.table.view?.fields?.length ?? 0}
          onAxisResize={handleAxisResize}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          ref={setDxGrid}
        />
      </Grid.Root>

      <RowActionsMenu
        model={model}
        rowIndex={menuState?.type === 'row' ? menuState.rowIndex : undefined}
        open={menuState?.type === 'row'}
        onOpenChange={close}
        triggerRef={triggerRef}
      />

      <ColumnActionsMenu
        model={model}
        fieldId={menuState?.type === 'column' ? menuState.fieldId : undefined}
        open={menuState?.type === 'column'}
        onOpenChange={close}
        onShowColumnSettings={showColumnSettings}
        triggerRef={triggerRef}
      />

      <ColumnSettings
        model={model}
        open={menuState?.type === 'columnSettings'}
        mode={menuState?.type === 'columnSettings' ? menuState?.mode ?? { type: 'create' } : { type: 'create' }}
        onOpenChange={close}
        triggerRef={triggerRef}
      />
    </>
  );
});

//
// CellEditor
//

export type TableCellEditorProps = GridScopedProps<
  Pick<CellEditorProps, 'model' | 'onEnter' | 'onFocus' | 'onComplete'>
>;

const TableCellEditor = ({ __gridScope, model, onEnter, ...props }: TableCellEditorProps) => {
  const { editing, setEditing } = useGridContext('TableCellEditor', __gridScope);
  const handleEnter: CellEditorProps['onEnter'] = (cell) => {
    setEditing(null);
    onEnter?.(cell);
  };

  return <CellEditor editing={editing} model={model} onEnter={handleEnter} {...props} />;
};

export const Table = {
  Root: TableRoot,
  Main: TableMain,
};
