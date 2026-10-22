//
// Copyright 2026 DXOS.org
//

//
// Spatial arrow navigation for the `grid` axes, as tabster's grid mover does it: an arrow moves to the item that is
// on screen in that direction, rather than to the next one in DOM order. Card layouts (a kanban's columns, a
// masonry's staggered columns) put the DOM order column-first, so DOM-order arrows jump about the screen.
//

export type SpatialDirection = 'up' | 'down' | 'left' | 'right';

export type SpatialRect = { left: number; top: number; right: number; bottom: number };

export type SpatialCandidate<T> = { rect: SpatialRect; value: T };

/** Edges this close count as touching, so a pixel of subpixel overlap does not put an item on the wrong side. */
const EDGE_TOLERANCE = 1;

export const ARROW_DIRECTIONS: Record<string, SpatialDirection> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const centerX = ({ left, right }: SpatialRect) => (left + right) / 2;
const centerY = ({ top, bottom }: SpatialRect) => (top + bottom) / 2;

/**
 * The candidate nearest `from` in `direction`, or undefined at the edge.
 *
 * - Left and right go to the nearest column on that side, then to the item in it nearest `from` vertically: from a
 *   card low in one kanban column to the card level with it in the next, not to that column's top.
 * - Up and down go to the nearest item above or below that shares some of `from`'s width, so a masonry column is
 *   walked in order even where a neighbouring column's staggered card starts nearer, and the end of a short kanban
 *   column is an end rather than a jump into the next column.
 */
export const findNearest = <T>(
  from: SpatialRect,
  candidates: readonly SpatialCandidate<T>[],
  direction: SpatialDirection,
): T | undefined => {
  const horizontal = direction === 'left' || direction === 'right';
  const forward = direction === 'right' || direction === 'down';

  // How far a candidate's near edge is past `from`'s far edge in the direction of travel; negative is behind.
  const gap = ({ rect }: SpatialCandidate<T>) =>
    horizontal
      ? forward
        ? rect.left - from.right
        : from.left - rect.right
      : forward
        ? rect.top - from.bottom
        : from.top - rect.bottom;
  // Distance across the direction of travel, centre to centre.
  const cross = ({ rect }: SpatialCandidate<T>) =>
    horizontal ? Math.abs(centerY(rect) - centerY(from)) : Math.abs(centerX(rect) - centerX(from));
  const byCross = (a: SpatialCandidate<T>, b: SpatialCandidate<T>) => cross(a) - cross(b) || gap(a) - gap(b);

  const ahead = candidates.filter((candidate) => gap(candidate) >= -EDGE_TOLERANCE);
  if (ahead.length === 0) {
    return undefined;
  }

  if (!horizontal) {
    const overlapping = ahead.filter(
      ({ rect }) => Math.min(rect.right, from.right) - Math.max(rect.left, from.left) > EDGE_TOLERANCE,
    );
    return [...overlapping].sort((a, b) => gap(a) - gap(b) || byCross(a, b))[0]?.value;
  }

  // The nearest column: every candidate starting within half of `from`'s own width of the nearest one.
  const nearest = Math.min(...ahead.map(gap));
  const extent = from.right - from.left;
  const band = ahead.filter((candidate) => gap(candidate) <= nearest + extent / 2);
  return [...band].sort(byCross)[0].value;
};
