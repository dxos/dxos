//
// Copyright 2026 DXOS.org
//

//
// Lattice mode geometry (docs/DESIGN.md §8b): shapes occupy whole cells of a coarse lattice, separated by
// fixed gutters. A cell's pitch is a one-cell shape plus a gutter; a shape spans any whole number of cells
// on each axis and covers the gutters between them, so every channel between shapes is one gutter wide.
//

import { type Bounds, type ElementId, type Node } from '../model/types.ts';
import { nodeBounds } from './shapes.ts';

/** The size of a one-cell shape and the gutter between shapes, in scene units. */
export type LatticeSpec = { width: number; height: number; gutterX: number; gutterY: number };

export const DEFAULT_LATTICE: LatticeSpec = { width: 256, height: 128, gutterX: 128, gutterY: 64 };

/** A shape on the lattice: its first (top-left) cell and how many cells it spans on each axis. */
export type LatticeCell = { col: number; row: number; spanX: number; spanY: number };

const pitchX = (spec: LatticeSpec) => spec.width + spec.gutterX;
const pitchY = (spec: LatticeSpec) => spec.height + spec.gutterY;

/** The nearest whole span (at least 1) for a frame `length` long, one cell being `cell` plus `gutter`. */
const spanOf = (length: number, cell: number, gutter: number): number =>
  Math.max(1, Math.round((length + gutter) / (cell + gutter)));

/** The lattice cells nearest a frame: the nearest whole spans, placed so their centre is nearest the frame's. */
export const toCell = (bounds: Bounds, spec: LatticeSpec): LatticeCell => {
  const spanX = spanOf(bounds.width, spec.width, spec.gutterX);
  const spanY = spanOf(bounds.height, spec.height, spec.gutterY);
  return {
    // `+ 0` folds -0 into 0, so a cell just left of the origin is the same key as the origin's.
    col: Math.round((bounds.x + bounds.width / 2) / pitchX(spec) - (spanX - 1) / 2) + 0,
    row: Math.round((bounds.y + bounds.height / 2) / pitchY(spec) - (spanY - 1) / 2) + 0,
    spanX,
    spanY,
  };
};

/** The frame a lattice cell range draws: its spanned shapes and the gutters between them. */
export const cellBounds = ({ col, row, spanX, spanY }: LatticeCell, spec: LatticeSpec): Bounds => ({
  x: col * pitchX(spec) - spec.width / 2,
  y: row * pitchY(spec) - spec.height / 2,
  width: spanX * spec.width + (spanX - 1) * spec.gutterX,
  height: spanY * spec.height + (spanY - 1) * spec.gutterY,
});

/**
 * A cell range resized to the frame a handle drag left (`from` was the frame before): on each axis the
 * moved edge snaps to the nearest cell edge and the opposite edge stays where it was, so a dragged face
 * steps one cell at a time; the range never shrinks below one cell, and an axis with no moved edge keeps
 * its cells.
 */
export const resizeCell = (cell: LatticeCell, from: Bounds, to: Bounds, spec: LatticeSpec): LatticeCell => {
  const axis = (
    [fromLow, fromHigh, toLow, toHigh]: [number, number, number, number],
    first: number,
    span: number,
    size: number,
    pitch: number,
  ): [first: number, span: number] => {
    const last = first + span - 1;
    if (Math.abs(toLow - fromLow) > Math.abs(toHigh - fromHigh)) {
      // The low edge moved: the cell whose low edge (`k x pitch - size / 2`) is nearest, up to the last cell.
      const next = Math.min(last, Math.round((toLow + size / 2) / pitch));
      return [next, last - next + 1];
    }
    if (toHigh !== fromHigh) {
      // The high edge moved: the cell whose high edge (`k x pitch + size / 2`) is nearest, from the first cell.
      const next = Math.max(first, Math.round((toHigh - size / 2) / pitch));
      return [first, next - first + 1];
    }
    return [first, span];
  };
  const [col, spanX] = axis(
    [from.x, from.x + from.width, to.x, to.x + to.width],
    cell.col,
    cell.spanX,
    spec.width,
    pitchX(spec),
  );
  const [row, spanY] = axis(
    [from.y, from.y + from.height, to.y, to.y + to.height],
    cell.row,
    cell.spanY,
    spec.height,
    pitchY(spec),
  );
  return { col, row, spanX, spanY };
};

/** A frame snapped onto the lattice: the nearest whole spans at the nearest cells. */
export const quantize = (bounds: Bounds, spec: LatticeSpec): Bounds => cellBounds(toCell(bounds, spec), spec);

const cellKey = (col: number, row: number) => `${col},${row}`;

/** Every lattice position a cell covers, as `col,row` keys. */
export const coveredCells = ({ col, row, spanX, spanY }: LatticeCell): string[] => {
  const keys: string[] = [];
  for (let x = col; x < col + spanX; x++) {
    for (let y = row; y < row + spanY; y++) {
      keys.push(cellKey(x, y));
    }
  }
  return keys;
};

/** Which node covers each lattice position, for the nodes not in `except` (those being moved or resized). */
export type Occupancy = ReadonlyMap<string, ElementId>;

export const occupancy = (
  nodes: Iterable<Node>,
  spec: LatticeSpec,
  except: ReadonlySet<ElementId> = new Set(),
): Occupancy => {
  const cells = new Map<string, ElementId>();
  for (const node of nodes) {
    if (!except.has(node.id)) {
      for (const key of coveredCells(toCell(nodeBounds(node), spec))) {
        cells.set(key, node.id);
      }
    }
  }
  return cells;
};

/** Whether a cell overlaps a position another node already covers. */
export const collides = (cell: LatticeCell, occupied: Occupancy): boolean =>
  coveredCells(cell).some((key) => occupied.has(key));

/**
 * The free cell of the same span nearest `cell`, searched ring by ring outwards (by the larger of the
 * column and row distances, then by row and column so the result is deterministic); `cell` itself when it is free.
 */
export const nearestFree = (cell: LatticeCell, occupied: Occupancy, maxRadius = 64): LatticeCell | undefined => {
  for (let radius = 0; radius <= maxRadius; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
          continue;
        }
        const candidate = { ...cell, col: cell.col + dx, row: cell.row + dy };
        if (!collides(candidate, occupied)) {
          return candidate;
        }
      }
    }
  }
  return undefined;
};
