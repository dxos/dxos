//
// Copyright 2024 DXOS.org
//

import React, {
  forwardRef,
  type PropsWithChildren,
  useCallback,
  useImperativeHandle,
  useState,
  type WheelEvent,
} from 'react';

import { getValue } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Filter, getSpace, fullyQualifiedId } from '@dxos/react-client/echo';
import { useAttention } from '@dxos/react-ui-attention';
import { type DxGridElement, Grid, type GridContentProps, closestCell } from '@dxos/react-ui-grid';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { isNotFalsy } from '@dxos/util';

import { ColumnActionsMenu } from './ColumnActionsMenu';
import { ColumnSettings } from './ColumnSettings';
import { RowActionsMenu } from './RowActionsMenu';
import { type TableModel } from '../../model';
import { type GridCell } from '../../util';
import { TableCellEditor, type TableCellEditorProps } from '../TableCellEditor';

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

const TableRoot = ({ children }: TableRootProps) => {
  return (
    <StackItem.Content toolbar contentSize='intrinsic' classNames='relative'>
      {children}
    </StackItem.Content>
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

  const { hasAttention } = useAttention(model?.table ? fullyQualifiedId(model.table) : 'table');

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

  const handleEnter = useCallback<NonNullable<TableCellEditorProps['onEnter']>>(
    (cell) => {
      // TODO(burdon): Insert row only if bottom row isn't completely blank already.
      if (model && cell.row === model.getRowCount() - 1) {
        model.insertRow(cell.row);
      }
    },
    [model],
  );

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

  const handleAxisResize = useCallback<NonNullable<GridContentProps['onAxisResize']>>(
    (event) => {
      if (event.axis === 'col') {
        const columnIndex = parseInt(event.index, 10);
        model?.setColumnWidth(columnIndex, event.size);
      }
    },
    [model],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!hasAttention) {
        event.stopPropagation();
      }
    },
    [hasAttention],
  );

  // TODO(burdon): Factor out?
  const handleQuery = useCallback<NonNullable<TableCellEditorProps['onQuery']>>(
    async ({ field, props }, _text) => {
      if (model && props.referenceSchema && field.referencePath) {
        const space = getSpace(model.table);
        invariant(space);
        const schema = space.db.schemaRegistry.getSchema(props.referenceSchema);
        if (schema) {
          // TODO(burdon): Cache/filter.
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

  if (!model) {
    return <span role='none' className='attention-surface' />;
  }

  return (
    <>
      <Grid.Root id={model.table.id ?? 'table-grid'}>
        <TableCellEditor model={model} onEnter={handleEnter} onFocus={handleFocus} onQuery={handleQuery} />

        <Grid.Content
          onWheelCapture={handleWheel}
          className={mx(
            '[--dx-grid-base:var(--surface-bg)] [&_.dx-grid]:bs-min [&_.dx-grid]:shrink [&_.dx-grid]:max-is-max',
            inlineEndLine,
            blockEndLine,
          )}
          frozen={frozen}
          columns={model.columnMeta.value}
          limitRows={model.getRowCount() ?? 0}
          limitColumns={model.table.view?.fields?.length ?? 0}
          onAxisResize={handleAxisResize}
          onClick={model?.handleGridClick}
          onKeyDown={handleKeyDown}
          overscroll='trap'
          ref={setDxGrid}
        />
      </Grid.Root>

      <RowActionsMenu model={model} />
      <ColumnActionsMenu model={model} />
      <ColumnSettings model={model} />
    </>
  );
});

//
// CellEditor
//

export const Table = {
  Root: TableRoot,
  Main: TableMain,
};
