//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import type { ZoomTransform } from 'd3';

import { Scale } from './scale';

interface GridProps {
  scale: Scale
  transform?: ZoomTransform
  width: number
  height: number
}

/**
 * Create grid based on size and current zoom transform.
 * @param scale
 * @param width
 * @param height
 * @param transform d3.zoom transform.
 */
const createGrid = ({ scale, transform, width, height }: GridProps) => {
  const { x = 0, y = 0, k = 1 } = transform || {};
  const s = 1 / k;

  // TODO(burdon): Use the transform to create the range?
  //   https://github.com/d3/d3-zoom#transform_rescaleX

  // Scale grid size.
  const gs = Math.pow(2, Math.round(Math.log2(s * scale.gridSize)));

  // Extents.
  const mod = (n, gs, delta = 0) => (Math.floor(n / gs + delta) * gs);
  const xRange = d3.range(-mod((x + width / 2) * s, gs), mod((-x + width / 2) * s, gs, 1), gs);
  const yRange = d3.range(-mod((y + height / 2) * s, gs), mod((-y + height / 2) * s, gs, 1), gs);

  // Offset.
  const w = width * s;
  const h = height * s;
  const dx = -(x + width / 2) * s;
  const dy = -(y + height / 2) * s;

  // Create array of paths.
  const lines = [
    ...xRange.map(x => [[x, dy], [x, dy + h]]),
    ...yRange.map(y => [[dx, y], [dx + w, y]])
  ];

  // Create path.
  const createLine = d3.line();
  return lines.map(line => createLine(line as any)).join();
};

export const grid = ({ scale, transform, width, height }: GridProps) => (el) => {
  // Construct grid.
  el.selectAll('path')
    .data([{ id: 'grid' }])
    .join('path')
    .attr('d', createGrid({ scale, transform, width, height } ));

  if (transform) {
    el.attr('transform', transform);
    el.attr('stroke-width', 1 / transform.k);
  }
}
