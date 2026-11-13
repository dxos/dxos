//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import {
  type DxGridElement,
  type DxGridPlane,
  type DxGridPlaneCells,
  type EditorKeyHandler,
  Grid,
  GridCellEditor,
  type GridContentProps,
  type GridEditing,
  editorKeys,
  parseCellIndex,
} from '@dxos/react-ui-grid';

// #region sheet
const COLUMNS = ['Item', 'Q1', 'Q2', 'Q3', 'Total'];

const ROWS = [
  ['Hosting', '1200', '1350', '1400'],
  ['Design', '800', '650', '900'],
  ['Support', '400', '420', '380'],
  ['Travel', '300', '0', '550'],
  // Blank rows to fill in, past the bottom of a small frame, as in a spreadsheet.
  ...Array.from({ length: 40 }, () => ['', '', '', '']),
];

/** Blank columns past the totals, so the sheet runs off the right edge too. */
const BLANK_COLUMNS = 6;

const TOTAL = COLUMNS.length - 1;

/** Each row's total, from the quarters before it; a cell that is not a number counts as zero, and a blank row has none. */
const total = (row: string[]) =>
  row.every((value) => value === '')
    ? ''
    : String(
        row
          .slice(1, TOTAL)
          .reduce((sum, value) => sum + (Number(value) || 0), 0),
      );

/** The cells of a plane, keyed `col,row`: the header row is a frozen plane, and the values are the grid plane. */
const toCells = (rows: string[][], plane: DxGridPlane): DxGridPlaneCells => {
  if (plane === 'frozenRowsStart') {
    return Object.fromEntries(
      COLUMNS.map((label, col) => [
        `${col},0`,
        { value: label, readonly: true },
      ]),
    );
  }
  return Object.fromEntries(
    rows.flatMap((row, rowIndex) => [
      ...row.map((value, col) => [`${col},${rowIndex}`, { value }]),
      [`${TOTAL},${rowIndex}`, { value: total(row), readonly: true }],
    ]),
  );
};

const frozen = { frozenRowsStart: 1 };
const columnDefault = {
  frozenRowsStart: { size: 112, readonly: true },
  grid: { size: 112 },
};
const rowDefault = {
  frozenRowsStart: { size: 32, readonly: true },
  grid: { size: 32 },
};

/** A small budget: double-click or type into a cell to edit it, and the row's total follows. */
export const BudgetSheet = () => {
  const [rows, setRows] = useState(ROWS);
  const [editing, setEditing] = useState<GridEditing>(null);
  const [grid, setGrid] = useState<DxGridElement | null>(null);

  // The grid asks for the cells it shows; a new callback makes it ask again.
  const getCells = useCallback<NonNullable<GridContentProps['getCells']>>(
    (_range, plane) => toCells(rows, plane),
    [rows],
  );

  const handleBlur = (value?: string) => {
    if (value !== undefined && editing) {
      const { col, row } = parseCellIndex(editing.index);
      setRows((current) =>
        current.map((cells, rowIndex) =>
          rowIndex === row
            ? cells.map((cell, column) => (column === col ? value : cell))
            : cells,
        ),
      );
    }
  };

  // Enter and Tab close the editor and move the focus down or across, as a spreadsheet does.
  const handleClose = useCallback<EditorKeyHandler>(
    (_value, event) => {
      if (event) {
        grid?.refocus(
          event.key === 'Tab' ? 'col' : 'row',
          event.shift ? -1 : 1,
        );
      }
    },
    [grid],
  );

  const extensions = useMemo(
    () => [editorKeys({ onClose: handleClose })],
    [handleClose],
  );

  return (
    <Grid.Root id='budget' editing={editing} onEditingChange={setEditing}>
      <GridCellEditor
        getCellContent={(index) =>
          rows[parseCellIndex(index).row]?.[parseCellIndex(index).col]
        }
        extensions={extensions}
        onBlur={handleBlur}
      />
      <Grid.Content
        ref={setGrid}
        limitColumns={COLUMNS.length + BLANK_COLUMNS}
        limitRows={rows.length}
        frozen={frozen}
        columnDefault={columnDefault}
        rowDefault={rowDefault}
        getCells={getCells}
        // Wheel and trackpad scrolls stay in the grid: no page scroll, no back/forward swipe.
        overscroll='trap'
      />
    </Grid.Root>
  );
};
// #endregion
