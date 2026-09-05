//
// Copyright 2026 DXOS.org
//

import { type MutableRefObject } from 'react';

import { createContext } from '@dxos/react-ui';

import { type GridConstraints, type GridMode, type GridPosition, type Layout } from './engine';
import { type GridCellSize } from './geometry';

// Kept out of `Board.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

/** Selection behaviour (mirrors `react-ui-list`'s `ListSelectionMode`). */
export type SelectionMode = 'single' | 'multi';

export type BoardContextValue = {
  readonly: boolean;
  layout: Layout;
  mode: GridMode;
  /** Selection mode, or undefined when selection is disabled. */
  selectionMode?: SelectionMode;
  /** Currently selected tile ids (empty when nothing is selected / selection disabled). */
  selected: ReadonlySet<string>;
  /** Toggle a tile's selection on click; `additive` (shift-click, multi only) preserves the rest. */
  toggleSelection: (id: string, additive: boolean) => void;
  /** Scale factor in (0, 1]: 1 is actual size (draggable); below 1 is an overview (drag/resize off). */
  zoom: number;
  /** Smallest zoom the controls will step down to. */
  minZoom: number;
  /** Step the zoom in/out by `zoomStep`, clamped to [minZoom, 1]. */
  zoomIn: () => void;
  zoomOut: () => void;
  /** Cell size and gap in px (converted from the `cellSize`/`gap` props, which are in rem). */
  cellSize: GridCellSize;
  gap: number;
  /** Perimeter breathing room around the grid, in cell units (see the `margin` prop). */
  margin: number;
  /** Column/row extent to render (the backdrop shows at least this; grows with content). */
  columns: number;
  rows: number;
  /** When true, backdrop cells render their `x,y` coordinate (debugging aid). */
  debug: boolean;
  /** When true, the board is padded by half the viewport so any cell can be scrolled to the centre. */
  overscroll: boolean;
  /** Overscroll padding in px (half the viewport on each axis), or 0 when disabled. */
  overscrollPad: { x: number; y: number };
  /** Scroll viewport size in px (0 until measured); used to centre a board smaller than the viewport. */
  viewportSize: { width: number; height: number };
  containerId: string;
  /** During an active drag, the layout the board would settle into — tiles animate to these
   * positions and spring back to `layout` when the drag ends without a drop. Undefined when idle. */
  previewLayout?: Layout;
  /** True while a tile is being resized (a pointer drag, not a Dnd drag); gates the resize auto-scroll. */
  resizing: boolean;
  /** Scroll viewport element; set by `Board.Container`, used by the controller to center. */
  viewportRef: MutableRefObject<HTMLDivElement | null>;
  /** Anchor captured before an incremental zoom (consumed by the zoom-anchor animation). */
  pendingAnchor: MutableRefObject<{ x: number; y: number } | null>;
  /** True while a zoom animation is in flight; the animation clears it when it settles. */
  zooming: MutableRefObject<boolean>;
  /** Scroll the viewport to center the board, or a specific cell when its id is given. `smooth`
   * defaults to true; pass false to jump instantly (used for the flicker-free mount centering). */
  center: (cell?: string, smooth?: boolean) => void;
  onAdd?: (position: GridPosition) => void;
  onDelete?: (id: string) => void;
  onResize: (id: string, size: { w: number; h: number }, constraints?: GridConstraints) => void;
  /** Report an in-progress resize (snapped cells) so the engine runs live and other tiles move;
   * pass null on drop/cancel. */
  onResizePreview: (id: string, size: { w: number; h: number } | null) => void;
};

export const [BoardContextProvider, useBoardContext] = createContext<BoardContextValue>('BoardContext');
