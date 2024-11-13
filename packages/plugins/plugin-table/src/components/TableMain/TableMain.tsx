//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useCallback, useImperativeHandle, useState, type WheelEvent } from 'react';

import { invariant } from '@dxos/invariant';
import { Filter, getSpace } from '@dxos/react-client/echo';
import { useAttention } from '@dxos/react-ui-attention';
import { type DxGridElement, Grid, type GridContentProps, closestCell } from '@dxos/react-ui-grid';
import { getValue } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { ColumnActionsMenu } from './ColumnActionsMenu';
import { ColumnSettings } from './ColumnSettings';
import { RowActionsMenu } from './RowActionsMenu';
import { type TableModel } from '../../model';
import { type GridCell } from '../../types';
import { TableCellEditor, type TableCellEditorProps } from '../TableCellEditor';

const frozen = { frozenRowsStart: 1, frozenColsEnd: 1 };

//
// Main
//

export type TableController = {
  update?: (cell?: GridCell) => void;
};

export type TableMainProps = {
  model: TableModel;
  attendableId: string;
};

export const TableMain = forwardRef<TableController, TableMainProps>(({ model, attendableId }, forwardedRef) => {
  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
  const { hasAttention } = useAttention(attendableId);
  /**
   * Provides an external controller that can be called to repaint the table.
   */
  useImperativeHandle<TableController, TableController>(
    forwardedRef,
    () => {
      if (!dxGrid) {
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
      if (cell.row === model.getRowCount() - 1) {
        model.insertRow(cell.row);
      }
    },
    [model],
  );

  const handleKeyDown = useCallback<NonNullable<GridContentProps['onKeyDown']>>(
    (event) => {
      const cell = closestCell(event.target);
      if (!cell) {
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
      if (props.referenceSchema && field.referencePath) {
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

  return (
    <>
      <Grid.Root id={model.table.id}>
        <TableCellEditor model={model} onEnter={handleEnter} onFocus={handleFocus} onQuery={handleQuery} />
        <Grid.Content
          frozen={frozen}
          columns={model.columnMeta.value}
          limitRows={model.getRowCount() ?? 0}
          limitColumns={model.table.view?.fields?.length ?? 0}
          onAxisResize={handleAxisResize}
          onClick={model?.handleGridClick}
          onKeyDown={handleKeyDown}
          onWheelCapture={handleWheel}
          className='[--dx-grid-base:var(--surface-bg)] [&_.dx-grid]:bs-min [&_.dx-grid]:shrink'
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
