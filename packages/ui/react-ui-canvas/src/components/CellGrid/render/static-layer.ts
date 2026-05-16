//
// Copyright 2026 DXOS.org
//

import type { Cell, Headers, Row, Viewport } from '../state/types';
import { cellWidth, visibleCellRange, visibleCells, worldToScreen } from '../state/viewport';

export type RenderCellArgs<T> = {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  cell: Cell<T>;
};

export type RenderCell<T = unknown> = (args: RenderCellArgs<T>) => void;

export type StaticLayerStyle = {
  /** Grid line color, e.g. 'rgba(0,0,0,0.08)'. */
  gridLine: string;
  /** Row band fill (alternating), e.g. 'rgba(0,0,0,0.02)'. */
  rowBand?: string;
  background?: string;
};

export type DrawCellsOptions<T> = {
  ctx: CanvasRenderingContext2D;
  size: { width: number; height: number };
  viewport: Viewport;
  headers: Headers;
  rows: ReadonlyArray<Row>;
  cells: ReadonlyMap<string, Cell<T>>;
  renderCell: RenderCell<T>;
  style: StaticLayerStyle;
};

/**
 * Paint the static layer: background, gridlines, alternating row bands, and cells.
 * Pure with respect to its inputs (writes only to the supplied ctx).
 */
export const drawCells = <T>({
  ctx,
  size,
  viewport,
  headers,
  rows,
  cells,
  renderCell,
  style,
}: DrawCellsOptions<T>): void => {
  ctx.clearRect(0, 0, size.width, size.height);

  if (style.background) {
    ctx.fillStyle = style.background;
    ctx.fillRect(0, 0, size.width, size.height);
  }

  const range = visibleCellRange(viewport, headers, size);
  const w = cellWidth(viewport);
  const h = viewport.cellHeight;

  // Row bands. Paint odd rows so the stripe pattern matches the TrackHeader's
  // label backgrounds (which darken odd row indices) — keeps the frozen left
  // column and the cell area visually in lockstep.
  if (style.rowBand) {
    ctx.fillStyle = style.rowBand;
    for (let row = range.minRow; row <= Math.min(range.maxRow, rows.length - 1); row++) {
      if (row % 2 === 0) {
        continue;
      }
      const y = headers.top + row * h - viewport.scrollY;
      ctx.fillRect(headers.left, y, size.width - headers.left, h);
    }
  }

  // Gridlines.
  ctx.strokeStyle = style.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let col = range.minCol; col <= range.maxCol + 1; col++) {
    const x = Math.floor(headers.left + col * w - viewport.scrollX) + 0.5;
    if (x < headers.left) {
      continue;
    }
    ctx.moveTo(x, headers.top);
    ctx.lineTo(x, size.height);
  }
  for (let row = range.minRow; row <= Math.min(range.maxRow + 1, rows.length); row++) {
    const y = Math.floor(headers.top + row * h - viewport.scrollY) + 0.5;
    if (y < headers.top) {
      continue;
    }
    ctx.moveTo(headers.left, y);
    ctx.lineTo(size.width, y);
  }
  ctx.stroke();

  // Cells.
  ctx.save();
  ctx.beginPath();
  ctx.rect(headers.left, headers.top, size.width - headers.left, size.height - headers.top);
  ctx.clip();
  for (const cell of visibleCells(cells, range)) {
    if (cell.row >= rows.length) {
      continue;
    }
    const rect = worldToScreen(viewport, headers, cell);
    renderCell({ ctx, ...rect, cell });
  }
  ctx.restore();
};
