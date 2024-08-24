//
// Copyright 2024 DXOS.org
//

import { type MouseEvent, useEffect, useState } from 'react';

import { type CellAddress, type CellIndex, cellFromA1Notation, cellToA1Notation } from '../../model';

// export type Bounds = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
// export type Dimension = Pick<DOMRect, 'width' | 'height'>;

export type SizeMap = Record<string, number>;

export type RowPosition = { row: number } & Pick<DOMRect, 'top' | 'height'>;
export type ColumnPosition = { column: number } & Pick<DOMRect, 'left' | 'width'>;

export const axisWidth = 'calc(var(--rail-size)-2px)';
export const axisHeight = 34;

export const minWidth = 40;
export const maxWidth = 800;

export const minHeight = 34;
export const maxHeight = 400;

export const defaultWidth = 200;
export const defaultHeight = minHeight;

/**
 * Cell nodes are identified by their A1 notation.
 */
export const CELL_DATA_KEY = 'cell';

export type GridLayoutProps = {
  rows: CellIndex[];
  columns: CellIndex[];
  rowSizes: SizeMap;
  columnSizes: SizeMap;
};

export type GridLayout = {
  width: number;
  height: number;
  rowRange: RowPosition[];
  columnRange: ColumnPosition[];
};

/**
 * Calculates the grid geometry for the current viewport.
 */
export const useGridLayout = ({
  scroller,
  size,
  rows,
  columns,
  rowSizes,
  columnSizes,
}: GridLayoutProps & {
  scroller: HTMLDivElement | null;
  size: { width: number; height: number };
}): GridLayout => {
  const [rowPositions, setRowPositions] = useState<RowPosition[]>([]);
  useEffect(() => {
    let y = 0;
    setRowPositions(
      rows.map((idx, i) => {
        const height = rowSizes[idx] ?? defaultHeight;
        const top = y;
        y += height - 1;
        return { row: i, top, height };
      }),
    );
  }, [rows, rowSizes]);

  const [columnPositions, setColumnPositions] = useState<ColumnPosition[]>([]);
  useEffect(() => {
    let x = 0;
    setColumnPositions(
      columns.map((idx, i) => {
        const width = columnSizes[idx] ?? defaultWidth;
        const left = x;
        x += width - 1;
        return { column: i, left, width };
      }),
    );
  }, [columns, columnSizes]);

  const height = rowPositions.length
    ? rowPositions[rowPositions.length - 1].top + rowPositions[rowPositions.length - 1].height
    : 0;

  const width = columnPositions.length
    ? columnPositions[columnPositions.length - 1].left + columnPositions[columnPositions.length - 1].width
    : 0;

  //
  // Virtual window.
  // TODO(burdon): Preserve edit state, selection.
  // TODO(burdon): BUG: Doesn't scroll to cursor if jump to end.
  //

  const [{ rowRange, columnRange }, setWindow] = useState<{
    rowRange: RowPosition[];
    columnRange: ColumnPosition[];
  }>({ rowRange: [], columnRange: [] });
  useEffect(() => {
    const handleScroll = () => {
      if (!scroller) {
        return;
      }

      const { scrollLeft: left, scrollTop: top, clientWidth: width, clientHeight: height } = scroller;

      let rowStart = 0;
      let rowEnd = 0;
      for (let i = 0; i < rowPositions.length; i++) {
        const row = rowPositions[i];
        if (row.top <= top) {
          rowStart = i;
        }
        if (row.top + row.height >= top + height) {
          rowEnd = i;
          break;
        }
      }

      let columnStart = 0;
      let columnEnd = 0;
      for (let i = 0; i < columnPositions.length; i++) {
        const column = columnPositions[i];
        if (column.left <= left) {
          columnStart = i;
        }
        if (column.left + column.width >= left + width) {
          columnEnd = i;
          break;
        }
      }

      const overscan = 5;
      setWindow({
        rowRange: rowPositions.slice(
          Math.max(0, rowStart - overscan),
          Math.min(rowPositions.length, rowEnd + overscan),
        ),
        columnRange: columnPositions.slice(
          Math.max(0, columnStart - overscan),
          Math.min(columnPositions.length, columnEnd + overscan),
        ),
      });
    };

    scroller?.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => {
      scroller?.removeEventListener('scroll', handleScroll);
    };
  }, [size.width, size.height, rowPositions, columnPositions]);

  return { width, height, rowRange, columnRange };
};

/**
 * Find child node at mouse pointer.
 */
export const getCellAtPointer = (event: MouseEvent): CellAddress | undefined => {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const root = element?.closest<HTMLDivElement>(`[data-${CELL_DATA_KEY}]`);
  if (root) {
    const value = root.dataset[CELL_DATA_KEY];
    if (value) {
      return cellFromA1Notation(value);
    }
  }
};

/**
 * Get element.
 */
export const getCellElement = (root: HTMLElement, cell: CellAddress): HTMLElement | null => {
  const pos = cellToA1Notation(cell);
  return root.querySelector(`[data-${CELL_DATA_KEY}="${pos}"]`);
};
