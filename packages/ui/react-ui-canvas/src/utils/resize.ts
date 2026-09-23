//
// Copyright 2026 DXOS.org
//

//
// Resize geometry as a pure function of the start frame, the handle and the pointer offset, so the
// view only feeds it the drag and the projection receives one `resize` intent.
//

import { type Handle } from '../model/atoms.ts';
import { type Bounds, type Point, type Size } from '../model/types.ts';

export type ResizeOptions = {
  minSize: Size;
  maxSize?: Size;
  /** Both edges of a moved axis move by the same amount, so the centre stays put (shift-drag). */
  symmetric?: boolean;
  /** Snaps a moving edge; the fixed edge (or the centre when symmetric) never moves. */
  snap?: (value: number) => number;
};

const identity = (value: number) => value;

/** Resize by a handle: the moving edges land on `snap`, the opposite edges stay put, sizes clamp to the limits. */
export const resizeBounds = (
  start: Bounds,
  handle: Handle,
  delta: Point,
  { minSize, maxSize, symmetric = false, snap = identity }: ResizeOptions,
): Bounds => {
  const horizontal = resizeAxis(
    { origin: start.x, length: start.width },
    { start: handle.includes('w'), end: handle.includes('e') },
    delta.x,
    { min: minSize.width, max: maxSize?.width, symmetric, snap },
  );
  const vertical = resizeAxis(
    { origin: start.y, length: start.height },
    { start: handle.includes('n'), end: handle.includes('s') },
    delta.y,
    { min: minSize.height, max: maxSize?.height, symmetric, snap },
  );
  return { x: horizontal.origin, y: vertical.origin, width: horizontal.length, height: vertical.length };
};

type Axis = { origin: number; length: number };
type AxisOptions = { min: number; max?: number; symmetric: boolean; snap: (value: number) => number };

const resizeAxis = (
  axis: Axis,
  moving: { start: boolean; end: boolean },
  delta: number,
  { min, max, symmetric, snap }: AxisOptions,
): Axis => {
  if (!moving.start && !moving.end) {
    return axis;
  }
  const center = axis.origin + axis.length / 2;
  let start = axis.origin;
  let end = axis.origin + axis.length;
  if (moving.end) {
    end = snap(end + delta);
  }
  if (moving.start) {
    start = snap(start + delta);
  }
  if (symmetric) {
    const half = moving.end ? end - center : center - start;
    const length = clamp(2 * half, min, max);
    return { origin: center - length / 2, length };
  }
  const length = clamp(end - start, min, max);
  return moving.start ? { origin: end - length, length } : { origin: start, length };
};

const clamp = (value: number, min: number, max: number | undefined): number =>
  Math.min(Math.max(value, min), max ?? Infinity);
