//
// Copyright 2024 DXOS.org
//

import React, {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type WheelEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createIntent } from '@dxos/app-framework';
import { useIntentDispatcher } from '@dxos/app-framework/react';
import { type CellRange, rangeToA1Notation } from '@dxos/compute';
import { defaultColSize, defaultRowSize } from '@dxos/lit-grid';
import { DropdownMenu, Icon, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import {
  type DxGridCellIndex,
  type DxGridElement,
  type DxGridPosition,
  type EditorBlurHandler,
  type EditorKeyHandler,
  Grid,
  GridCellEditor,
  type GridContentProps,
  closestCell,
  editorKeys,
  parseCellIndex,
} from '@dxos/react-ui-grid';

import { type RangeController, rangeExtension, sheetExtension } from '../../extensions';
import { useSelectThreadOnCellFocus, useUpdateFocusedCellOnThreadSelection } from '../../integrations';
import { meta } from '../../meta';
import { DEFAULT_COLS, DEFAULT_ROWS, SheetAction } from '../../types';
import { useSheetContext } from '../SheetContext';

import { colLabelCell, rowLabelCell, useSheetModelDxGridProps } from './util';

const inertPosition: DxGridPosition = { plane: 'grid', col: 0, row: 0 };

const initialCells = {
  grid: {},
  frozenColsStart: [...Array(64)].reduce((acc, _, i) => {
    acc[`0,${i}`] = rowLabelCell(i);
    return acc;
  }, {}),
  frozenRowsStart: [...Array(12)].reduce((acc, _, i) => {
    acc[`${i},0`] = colLabelCell(i);
    return acc;
  }, {}),
};

const frozen = {
  frozenColsStart: 1,
  frozenRowsStart: 1,
};

const sheetColDefault = {
  frozenColsStart: { size: 48, readonly: true, focusUnfurl: false },
  grid: { size: defaultColSize, resizeable: true },
};
const sheetRowDefault = {
  frozenRowsStart: { size: defaultRowSize, readonly: true, focusUnfurl: false },
  grid: { size: defaultRowSize, resizeable: true },
};

export const GridSheet = () => {
  const { t } = useTranslation(meta.id);
  const { id, model, editing, setCursor, setRange, cursor, cursorFallbackRange, activeRefs, ignoreAttention } =
    useSheetContext();
  // NOTE(thure): using `useState` instead of `useRef` works with refs provided by `@lit/react` and gives us
  //  a reliable dependency for `useEffect` whereas `useLayoutEffect` does not guarantee the element will be defined.
  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
  const [extraplanarFocus, setExtraplanarFocus] = useState<DxGridPosition | null>(null);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const rangeController = useRef<RangeController>(null);
  const { hasAttention } = useAttention(id);

  const handleFocus = useCallback(
    (event: FocusEvent) => {
      if (!editing) {
        const cell = closestCell(event.target);
        if (cell) {
          if (cell.plane === 'grid') {
            setCursor({ col: cell.col, row: cell.row });
            setExtraplanarFocus(null);
          } else {
            setExtraplanarFocus(cell);
          }
        } else {
          setExtraplanarFocus(null);
        }
      }
    },
    [editing],
  );

  // TODO(burdon): Validate formula before closing: hf.validateFormula();
  const handleClose = useCallback<EditorKeyHandler>(
    (_value, event) => {
      if (event) {
        const { key, shift } = event;
        const axis = ['Enter', 'ArrowUp', 'ArrowDown'].includes(key)
          ? 'row'
          : ['Tab', 'ArrowLeft', 'ArrowRight'].includes(key)
            ? 'col'
            : undefined;
        const delta = key.startsWith('Arrow') ? (['ArrowUp', 'ArrowLeft'].includes(key) ? -1 : 1) : shift ? -1 : 1;
        dxGrid?.refocus(axis, delta);
      }
    },
    [model, editing, dxGrid],
  );

  const handleBlur = useCallback<EditorBlurHandler>(
    (value) => {
      if (value !== undefined) {
        model.setValue(parseCellIndex(editing!.index), value);
      }
    },
    [model, editing],
  );

  const handleAxisResize = useCallback<NonNullable<GridContentProps['onAxisResize']>>(
    ({ axis, size, index: numericIndex }) => {
      if (axis === 'row') {
        const rowId = model.sheet.rows[parseInt(numericIndex)];
        model.sheet.rowMeta[rowId] ??= {};
        model.sheet.rowMeta[rowId].size = size;
      } else {
        const columnId = model.sheet.columns[parseInt(numericIndex)];
        model.sheet.columnMeta[columnId] ??= {};
        model.sheet.columnMeta[columnId].size = size;
      }
    },
    [model],
  );

  const handleSelect = useCallback<NonNullable<GridContentProps['onSelect']>>(
    ({ minCol, maxCol, minRow, maxRow }) => {
      const range: CellRange = { from: { col: minCol, row: minRow } };
      if (minCol !== maxCol || minRow !== maxRow) {
        range.to = { col: maxCol, row: maxRow };
      }
      if (editing) {
        // Update range selection in formula.
        rangeController.current?.setRange(rangeToA1Notation(range));
      } else {
        // Setting range while editing causes focus to move to null, avoid doing so.
        setRange(range.to ? range : undefined);
      }
    },
    [editing],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!ignoreAttention && !hasAttention) {
        event.stopPropagation();
      }
    },
    [hasAttention, ignoreAttention],
  );

  const selectEntireAxis = useCallback(
    (pos: DxGridPosition) => {
      switch (pos.plane) {
        case 'frozenRowsStart':
          return dxGrid?.setSelection({
            start: { col: pos.col, row: 0, plane: 'grid' },
            end: {
              col: pos.col,
              row: model.sheet.rows.length - 1,
              plane: 'grid',
            },
          });
        case 'frozenColsStart':
          return dxGrid?.setSelection({
            start: { row: pos.row, col: 0, plane: 'grid' },
            end: {
              row: pos.row,
              col: model.sheet.columns.length - 1,
              plane: 'grid',
            },
          });
      }
    },
    [dxGrid, model.sheet],
  );

  const handleClick = useCallback(
    (event: MouseEvent) => {
      const cell = closestCell(event.target);
      if (cell) {
        selectEntireAxis(cell);
      }
    },
    [selectEntireAxis],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Backspace':
        case 'Delete':
          event.preventDefault();
          return cursorFallbackRange && model.clear(cursorFallbackRange);
        case 'Enter':
        case 'Space':
          if (dxGrid && extraplanarFocus) {
            switch (extraplanarFocus.plane) {
              case 'frozenRowsStart':
              case 'frozenColsStart':
                event.preventDefault();
                return selectEntireAxis(extraplanarFocus);
            }
          }
      }
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 'x':
          case 'X':
            event.preventDefault();
            return cursorFallbackRange && model.cut(cursorFallbackRange);
          case 'c':
          case 'C':
            event.preventDefault();
            return cursorFallbackRange && model.copy(cursorFallbackRange);
          case 'v':
          case 'V':
            event.preventDefault();
            return cursor && model.paste(cursor);
          case 'z':
            event.preventDefault();
            return event.shiftKey ? model.redo() : model.undo();
          case 'Z':
          case 'y':
            event.preventDefault();
            return model.redo();
        }
      }
    },
    [cursorFallbackRange, model, cursor, extraplanarFocus, selectEntireAxis],
  );

  const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState<DxGridPosition | null>(null);
  const contextMenuAxis = contextMenuOpen?.plane.startsWith('frozenRows') ? 'col' : 'row';

  const handleContextMenu = useCallback((event: MouseEvent) => {
    const cell = closestCell(event.target);
    if (cell && cell.plane.startsWith('frozen')) {
      event.preventDefault();
      contextMenuAnchorRef.current = event.target as HTMLButtonElement;
      setContextMenuOpen(cell);
    }
  }, []);

  const handleAxisMenuAction = useCallback(
    (operation: 'insert-before' | 'insert-after' | 'drop') => {
      switch (operation) {
        case 'insert-before':
        case 'insert-after':
          return dispatch(
            createIntent(SheetAction.InsertAxis, {
              model,
              axis: contextMenuAxis,
              index: contextMenuOpen![contextMenuAxis] + (operation === 'insert-before' ? 0 : 1),
            }),
          );
        case 'drop':
          return dispatch(
            createIntent(SheetAction.DropAxis, {
              model,
              axis: contextMenuAxis,
              axisIndex: model.sheet[contextMenuAxis === 'row' ? 'rows' : 'columns'][contextMenuOpen![contextMenuAxis]],
            }),
          );
      }
    },
    [contextMenuAxis, contextMenuOpen, model, dispatch],
  );

  const { columns, rows } = useSheetModelDxGridProps(dxGrid, model);

  const extensions = useMemo(
    () => [
      editorKeys({
        onClose: handleClose,
        ...(editing?.initialContent && { onNav: handleClose }),
      }),
      sheetExtension({ functions: model.graph.getFunctions() }),
      rangeExtension({
        onInit: (fn) => (rangeController.current = fn),
        onStateChange: (state) => {
          if (dxGrid) {
            // This can’t dispatch a setState in this component, otherwise the cell editor remounts and loses focus.
            dxGrid.mode = typeof state.activeRange === 'undefined' ? 'edit' : 'edit-select';
          }
        },
      }),
    ],
    [model, handleClose, editing],
  );

  const getCellContent = useCallback(
    (index: DxGridCellIndex) => {
      return model.getCellText(parseCellIndex(index));
    },
    [model],
  );

  useUpdateFocusedCellOnThreadSelection(dxGrid);
  useSelectThreadOnCellFocus();

  return (
    // TODO(thure): Why are Table’s and Sheet’s editor boxes off by 1px?
    <div role='none' className='relative min-bs-0 [&_.cm-editor]:!border-lb [&_.cm-editor]:!border-transparent'>
      <GridCellEditor getCellContent={getCellContent} extensions={extensions} onBlur={handleBlur} />
      <Grid.Content
        initialCells={initialCells}
        limitColumns={DEFAULT_COLS}
        limitRows={DEFAULT_ROWS}
        columns={columns}
        rows={rows}
        // TODO(burdon): `col` vs. `column`?
        columnDefault={sheetColDefault}
        rowDefault={sheetRowDefault}
        frozen={frozen}
        onAxisResize={handleAxisResize}
        onSelect={handleSelect}
        onFocus={handleFocus}
        onWheelCapture={handleWheel}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        overscroll='trap'
        className='[--dx-grid-base:var(--baseSurface)] [&_.dx-grid]:absolute [&_.dx-grid]:inset-0'
        activeRefs={activeRefs}
        ref={setDxGrid}
      />
      <DropdownMenu.Root
        modal={false}
        open={!!contextMenuOpen}
        onOpenChange={(nextOpen) => setContextMenuOpen(nextOpen ? inertPosition : null)}
      >
        <DropdownMenu.VirtualTrigger virtualRef={contextMenuAnchorRef} />
        <DropdownMenu.Content side={contextMenuAxis === 'col' ? 'bottom' : 'right'} sideOffset={4} collisionPadding={8}>
          <DropdownMenu.Viewport>
            <DropdownMenu.Item
              onClick={() => handleAxisMenuAction('insert-before')}
              data-testid={`grid.${contextMenuAxis}.insert-before`}
            >
              <Icon
                size={5}
                icon={contextMenuAxis === 'col' ? 'ph--columns-plus-left--regular' : 'ph--rows-plus-top--regular'}
              />
              <span>{t(`add ${contextMenuAxis} before label`)}</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => handleAxisMenuAction('insert-after')}
              data-testid={`grid.${contextMenuAxis}.insert-after`}
            >
              <Icon
                size={5}
                icon={contextMenuAxis === 'col' ? 'ph--columns-plus-right--regular' : 'ph--rows-plus-bottom--regular'}
              />
              <span>{t(`add ${contextMenuAxis} after label`)}</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => handleAxisMenuAction('drop')}
              data-testid={`grid.${contextMenuAxis}.drop`}
            >
              <Icon size={5} icon='ph--backspace--regular' />
              <span>{t(`delete ${contextMenuAxis} label`)}</span>
            </DropdownMenu.Item>
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};
