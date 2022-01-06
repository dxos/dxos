//
// Copyright 2022 DXOS.org
//

import { Bounds, Point } from '@dxos/gem-x';

import { D3Selection } from '../../types';
import { dragMove } from './drag';

/**
 * Render basic bounding box.
 * @param group
 * @param bounds
 */
export const drawFrame = (group: D3Selection, bounds: Bounds) => {
  const { x, y, width, height } = bounds;
  group.selectAll('rect').data([0]).join('rect')
    .classed('frame', true)
    .attr('x', x)
    .attr('y', y)
    .attr('width', width)
    .attr('height', height);
};

type Handle = { id: string, p: Point }

const handles: Handle[] = [
  { id: 'n', p: [0, 1] },
  { id: 'ne', p: [1, 1] },
  { id: 'e', p: [1, 0] },
  { id: 'se', p: [1, -1] },
  { id: 's', p: [0, -1] },
  { id: 'sw', p: [-1, -1] },
  { id: 'w', p: [-1, 0] },
  { id: 'nw', p: [-1, 1] }
];

/**
 * Render frame with resize handles.
 * @param group
 * @param bounds
 * @param onMove
 * @param onResize
 */
// TODO(burdon): Use createSvgCursor.
export const drawResizableFrame = (group: D3Selection, bounds: Bounds, onMove, onResize) => {
  const { x, y, width, height } = bounds;

  const cx = x + width / 2;
  const cy = y + height / 2;

  group.selectAll('rect').data([0]).join('rect')
    .call(dragMove(onMove))
    .classed('frame', true)
    .attr('x', x)
    .attr('y', y)
    .attr('width', width)
    .attr('height', height);

  group
    .selectAll('circle')
    .data(handles, (d: Handle) => d.id)
    .join('circle')
  // .call(handleDrag((handle, delta, end) => {
  //   const bounds = computeBounds({ x, y, width, height }, handle, delta);
  //   onUpdate(cursor, bounds, end);
  // }))
    .classed('frame-handle', true)
    .attr('cx', ({ p }) => cx + p[0] * width / 2)
    .attr('cy', ({ p }) => cy + p[1] * height / 2)
    .attr('r', 5); // TODO(burdon): Grow as zoomed.
};
