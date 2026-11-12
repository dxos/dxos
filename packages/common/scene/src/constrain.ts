//
// Copyright 2026 DXOS.org
//

//
// Where a part of a composite lands when an instance is resized (ANIMATION.md §4.1). A composite is authored once, at
// its own size, and placed at any other; before constraints every part was mapped by one uniform transform, so a
// card's footer drifted off the bottom edge and its body never grew. A constraint decides, per axis, which of the
// part's two edges follow the frame: the solve is per axis and purely geometric, so it is the same in either
// dimension and has no opinion about what the part draws.
//

import { type Bounds, type PartConstraint, type PartLayout, type Point } from './element.ts';

/** What a part occupies on one axis: where it starts, and how far it runs. */
type Span = { readonly start: number; readonly length: number };

const spanX = ({ x, width }: Bounds): Span => ({ start: x, length: width });
const spanY = ({ y, height }: Bounds): Span => ({ start: y, length: height });

const end = ({ start, length }: Span): number => start + length;

/**
 * `part` placed in `to`, given that it was authored in `from`. `scaled` is where the instance's own uniform fit puts
 * it, which `scale` — the default — takes as it is, so a composite with no constraint on this axis is unchanged.
 */
const solveSpan = (part: Span, scaled: Span, from: Span, to: Span, constraint: PartConstraint = 'scale'): Span => {
  if (constraint === 'scale') {
    return scaled;
  }
  // The gaps the part keeps from each edge of the frame it was authored in.
  const lead = part.start - from.start;
  const trail = end(from) - end(part);
  switch (constraint) {
    case 'min':
      return { start: to.start + lead, length: part.length };
    case 'max':
      return { start: end(to) - trail - part.length, length: part.length };
    case 'stretch':
      // Both edges follow, so the part absorbs the whole change; a frame smaller than its own gaps collapses to zero
      // rather than inverting, which would draw the part mirrored.
      return { start: to.start + lead, length: Math.max(0, to.length - lead - trail) };
    case 'center': {
      const offset = part.start + part.length / 2 - (from.start + from.length / 2);
      return { start: to.start + to.length / 2 + offset - part.length / 2, length: part.length };
    }
  }
};

/** The composite a part was authored in, and the instance frame it is drawn in. */
export type PartContext = {
  /** The composite's own bounds, which every part's coordinates are in. */
  readonly from: Bounds;
  /** The instance's frame. */
  readonly to: Bounds;
};

/**
 * A part's bounds in the instance's frame. `scaled` is the same part under the instance's uniform fit, which an axis
 * with no constraint keeps, so this is the identity for every composite authored before constraints existed.
 */
export const solvePartBounds = (
  part: Bounds,
  scaled: Bounds,
  { from, to }: PartContext,
  layout?: PartLayout,
): Bounds => {
  const x = solveSpan(spanX(part), spanX(scaled), spanX(from), spanX(to), layout?.x);
  const y = solveSpan(spanY(part), spanY(scaled), spanY(from), spanY(to), layout?.y);
  return { x: x.start, y: y.start, width: x.length, height: y.length };
};

/**
 * `point` as it lands when the box it sits in moves from `before` to `after`: its proportion along each axis is kept.
 * A link's free ends are mapped this way through the solved bounds of the box its two ends span, so a hairline
 * stretched across a card keeps its inset at either end rather than each end being solved on its own.
 */
export const mapPoint = (point: Point, before: Bounds, after: Bounds): Point => {
  const axis = (value: number, from: Span, to: Span): number =>
    from.length === 0 ? to.start + (value - from.start) : to.start + ((value - from.start) / from.length) * to.length;
  return {
    x: axis(point.x, spanX(before), spanX(after)),
    y: axis(point.y, spanY(before), spanY(after)),
  };
};

/** The box two points span; a horizontal or vertical pair spans a box with no height or width, which is fine. */
export const pointBounds = (first: Point, second: Point): Bounds => ({
  x: Math.min(first.x, second.x),
  y: Math.min(first.y, second.y),
  width: Math.abs(second.x - first.x),
  height: Math.abs(second.y - first.y),
});

/** Whether any element of a composite constrains an axis, which is what makes a resize re-solve rather than scale. */
export const hasConstraints = (elements: Iterable<{ readonly constrain?: PartLayout }>): boolean => {
  for (const element of elements) {
    if (element.constrain?.x !== undefined || element.constrain?.y !== undefined) {
      return true;
    }
  }
  return false;
};
