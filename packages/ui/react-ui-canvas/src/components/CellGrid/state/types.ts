//
// Copyright 2026 DXOS.org
//

export type CellCoord = { col: number; row: number };

export type Cell<T = unknown> = {
  col: number;
  row: number;
  length: number;
  data?: T;
};

export type Viewport = {
  /** World-space scroll offset (pixels). */
  scrollX: number;
  scrollY: number;
  /** Cell dimensions in pixels at zoomX = 1. */
  baseCellWidth: number;
  cellHeight: number;
  /** Horizontal zoom factor. */
  zoomX: number;
};

export type SelectionRange = {
  col0: number;
  row0: number;
  col1: number;
  row1: number;
};

export type Selection = {
  range: SelectionRange | null;
};

export type Tool = 'toggle' | 'select' | 'resize' | 'edit' | 'delete';

export type Row = { id: string; label?: string };

export type Headers = { left: number; top: number };
