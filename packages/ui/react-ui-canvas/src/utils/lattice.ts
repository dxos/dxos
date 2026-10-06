//
// Copyright 2026 DXOS.org
//

//
// Lattice mode geometry (docs/DESIGN.md §8b): shapes occupy whole cells of a coarse lattice, separated by
// fixed gutters. A cell's pitch is a one-cell shape plus a gutter; a shape spans an odd number of cells on
// each axis and covers the gutters between them, so its centre is always a cell centre and every channel
// between shapes is exactly one gutter wide.
//

import { type Bounds, type ElementId, type Node, type Point } from '../model/types.ts';
import { nodeBounds } from './shapes.ts';

/** The size of a one-cell shape and the gutter between shapes, in scene units. */
export type LatticeSpec = { width: number; height: number; gutterX: number; gutterY: number };

export const DEFAULT_LATTICE: LatticeSpec = { width: 256, height: 128, gutterX: 128, gutterY: 64 };

/** A shape on the lattice: its centre cell and how many cells it spans (odd) on each axis. */
export type LatticeCell = { col: number; row: number; spanX: number; spanY: number };

const pitchX = (spec: LatticeSpec) => spec.width + spec.gutterX;
const pitchY = (spec: LatticeSpec) => spec.height + spec.gutterY;

/** The nearest odd span (at least 1) for a frame `length` long, one cell being `cell` plus `gutter`. */
const oddSpan = (length: number, cell: number, gutter: number): number => {
  const cells = (length + gutter) / (cell + gutter);
  return Math.max(1, Math.round((cells - 1) / 2) * 2 + 1);
};

/** The lattice cell nearest a frame: the cell under its centre, and the odd spans nearest its size. */
export const toCell = (bounds: Bounds, spec: LatticeSpec): LatticeCell => ({
  col: Math.round((bounds.x + bounds.width / 2) / pitchX(spec)),
  row: Math.round((bounds.y + bounds.height / 2) / pitchY(spec)),
  spanX: oddSpan(bounds.width, spec.width, spec.gutterX),
  spanY: oddSpan(bounds.height, spec.height, spec.gutterY),
});

/** The frame a lattice cell draws: its spanned shapes and the gutters between them, centred on the cell. */
export const cellBounds = ({ col, row, spanX, spanY }: LatticeCell, spec: LatticeSpec): Bounds => {
  const width = spanX * spec.width + (spanX - 1) * spec.gutterX;
  const height = spanY * spec.height + (spanY - 1) * spec.gutterY;
  return { x: col * pitchX(spec) - width / 2, y: row * pitchY(spec) - height / 2, width, height };
};

/**
 * A cell resized to the frame a handle drag left (`from` was the frame before): the centre cell stays and
 * the span grows or shrinks symmetrically to the moved edge, so the dragged edge steps one cell position at a
 * time (an odd span cannot keep the opposite edge fixed and grow by one). An axis with no moved edge keeps
 * its span.
 */
export const resizeCell = (cell: LatticeCell, from: Bounds, to: Bounds, spec: LatticeSpec): LatticeCell => {
  const axis = (
    fromLow: number,
    fromHigh: number,
    toLow: number,
    toHigh: number,
    centre: number,
    size: number,
    gutter: number,
    span: number,
  ) => {
    const [low, high] = [Math.abs(toLow - fromLow), Math.abs(toHigh - fromHigh)];
    if (low === 0 && high === 0) {
      return span;
    }
    const half = high >= low ? toHigh - centre : centre - toLow;
    return oddSpan(Math.max(0, 2 * half), size, gutter);
  };
  return {
    ...cell,
    spanX: axis(
      from.x,
      from.x + from.width,
      to.x,
      to.x + to.width,
      cell.col * pitchX(spec),
      spec.width,
      spec.gutterX,
      cell.spanX,
    ),
    spanY: axis(
      from.y,
      from.y + from.height,
      to.y,
      to.y + to.height,
      cell.row * pitchY(spec),
      spec.height,
      spec.gutterY,
      cell.spanY,
    ),
  };
};

/** A frame snapped onto the lattice: the nearest cell centre and odd spans. */
export const quantize = (bounds: Bounds, spec: LatticeSpec): Bounds => cellBounds(toCell(bounds, spec), spec);

/** The centre of the cell nearest `point`, so a dragged shape's centre can be read off the pointer. */
export const nearestCentre = (point: Point, spec: LatticeSpec): Point => ({
  x: Math.round(point.x / pitchX(spec)) * pitchX(spec),
  y: Math.round(point.y / pitchY(spec)) * pitchY(spec),
});

const cellKey = (col: number, row: number) => `${col},${row}`;

/** Every lattice position a cell covers, as `col,row` keys. */
export const coveredCells = ({ col, row, spanX, spanY }: LatticeCell): string[] => {
  const [halfX, halfY] = [(spanX - 1) / 2, (spanY - 1) / 2];
  const keys: string[] = [];
  for (let x = col - halfX; x <= col + halfX; x++) {
    for (let y = row - halfY; y <= row + halfY; y++) {
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
