//
// Copyright 2024 DXOS.org
//

import React, {
  useCallback,
  useMemo,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type WheelEvent,
  type MouseEvent,
  useState,
} from 'react';

import { DropdownMenu, Icon, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import {
  closestCell,
  editorKeys,
  Grid,
  GridCellEditor,
  type DxGridElement,
  type EditorKeysProps,
  type GridContentProps,
  type DxGridPosition,
} from '@dxos/react-ui-grid';

import { colLabelCell, dxGridCellIndexToSheetCellAddress, rowLabelCell, useSheetModelDxGridProps } from './util';
import { DEFAULT_COLUMNS, DEFAULT_ROWS, rangeToA1Notation, type CellRange } from '../../defs';
import { rangeExtension, sheetExtension, type RangeController } from '../../extensions';
import { useSelectThreadOnCellFocus, useUpdateFocusedCellOnThreadSelection } from '../../integrations';
import { SHEET_PLUGIN } from '../../meta';
import { useSheetContext } from '../SheetContext';

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

const sheetRowDefault = { frozenRowsStart: { size: 32, readonly: true }, grid: { size: 32, resizeable: true } };
const sheetColDefault = { frozenColsStart: { size: 48, readonly: true }, grid: { size: 180, resizeable: true } };

export const GridSheet = () => {
  const { t } = useTranslation(SHEET_PLUGIN);
  const { id, model, editing, setEditing, setCursor, setRange, cursor, cursorFallbackRange, activeRefs } =
    useSheetContext();
  // NOTE(thure): using `useState` instead of `useRef` works with refs provided by `@lit/react` and gives us a reliable dependency for `useEffect` whereas `useLayoutEffect` does not guarantee the element will be defined.
  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
  const [extraplanarFocus, setExtraplanarFocus] = useState<DxGridPosition | null>(null);
  const rangeController = useRef<RangeController>();
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
  const handleClose = useCallback<NonNullable<EditorKeysProps['onClose']> | NonNullable<EditorKeysProps['onNav']>>(
    (value, { key, shift }) => {
      if (value !== undefined) {
        model.setValue(dxGridCellIndexToSheetCellAddress(editing!.index), value);
      }
      setEditing(null);
      const axis = ['Enter', 'ArrowUp', 'ArrowDown'].includes(key)
        ? 'row'
        : ['Tab', 'ArrowLeft', 'ArrowRight'].includes(key)
          ? 'col'
          : undefined;
      const delta = key.startsWith('Arrow') ? (['ArrowUp', 'ArrowLeft'].includes(key) ? -1 : 1) : shift ? -1 : 1;
      dxGrid?.refocus(axis, delta);
    },
    [model, editing, dxGrid],
  );

  const handleBlur = useCallback(
    (value?: string) => {
      if (value !== undefined) {
        model.setValue(dxGridCellIndexToSheetCellAddress(editing!.index), value);
      }
      setEditing(null);
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
      if (!hasAttention) {
        event.stopPropagation();
      }
    },
    [hasAttention],
  );

  const selectEntireAxis = useCallback(
    (pos: DxGridPosition) => {
      switch (pos.plane) {
        case 'frozenRowsStart':
          return dxGrid?.setSelection({
            start: { col: pos.col, row: 0, plane: 'grid' },
            end: { col: pos.col, row: model.sheet.rows.length - 1, plane: 'grid' },
          });
        case 'frozenColsStart':
          return dxGrid?.setSelection({
            start: { row: pos.row, col: 0, plane: 'grid' },
            end: { row: pos.row, col: model.sheet.columns.length - 1, plane: 'grid' },
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
    (operation: 'add-before' | 'add-after' | 'remove') => {
      switch (operation) {
        case 'add-before':
        case 'add-after':
          model[contextMenuAxis === 'col' ? 'insertColumns' : 'insertRows'](
            contextMenuOpen![contextMenuAxis] + (operation === 'add-before' ? 0 : 1),
            1,
          );
          break;
        case 'remove':
        // console.warn('[model does not implement]');
      }
    },
    [contextMenuAxis, contextMenuOpen, model],
  );

  const { columns, rows } = useSheetModelDxGridProps(dxGrid, model);

  const extension = useMemo(
    () => [
      editorKeys({ onClose: handleClose, ...(editing?.initialContent && { onNav: handleClose }) }),
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
    (index: string) => {
      const cell = dxGridCellIndexToSheetCellAddress(index);
      return model.getCellText(cell);
    },
    [model],
  );

  useUpdateFocusedCellOnThreadSelection(dxGrid);
  useSelectThreadOnCellFocus();

  return (
    <>
      <GridCellEditor getCellContent={getCellContent} extension={extension} onBlur={handleBlur} />
      <Grid.Content
        initialCells={initialCells}
        limitColumns={DEFAULT_COLUMNS}
        limitRows={DEFAULT_ROWS}
        columns={columns}
        rows={rows}
        onAxisResize={handleAxisResize}
        onSelect={handleSelect}
        rowDefault={sheetRowDefault}
        columnDefault={sheetColDefault}
        frozen={frozen}
        onFocus={handleFocus}
        onWheelCapture={handleWheel}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        overscroll='inline'
        className='[--dx-grid-base:var(--surface-bg)]'
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
            <DropdownMenu.Item onClick={() => handleAxisMenuAction('add-before')}>
              <Icon
                size={5}
                icon={contextMenuAxis === 'col' ? 'ph--columns-plus-left--regular' : 'ph--rows-plus-top--regular'}
              />
              <span>{t(`add ${contextMenuAxis} before label`)}</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => handleAxisMenuAction('add-after')}>
              <Icon
                size={5}
                icon={contextMenuAxis === 'col' ? 'ph--columns-plus-right--regular' : 'ph--rows-plus-bottom--regular'}
              />
              <span>{t(`add ${contextMenuAxis} after label`)}</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item disabled onClick={() => handleAxisMenuAction('remove')}>
              <Icon size={5} icon='ph--backspace--regular' />
              <span>{t(`delete ${contextMenuAxis} label`)}</span>
            </DropdownMenu.Item>
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </>
  );
};
