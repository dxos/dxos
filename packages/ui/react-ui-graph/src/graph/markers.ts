//
// Copyright 2022 DXOS.org
//

import { line, select } from 'd3';

import { type D3Callable } from '../util';

const createLine = line();

export type MarkerOptions = {
  arrowSize?: number;
};

const createArrow =
  (length: number, offset: number, start: boolean): D3Callable =>
  (el) => {
    const height = length * 0.5;
    el.attr('markerWidth', length * 2)
      .attr('markerHeight', height * 2)
      .attr('viewBox', `-${length},-${height},${length * 2},${height * 2}`)
      .attr('orient', 'auto')
      .attr('refX', offset)
      .append('path')
      .attr('fill', 'none')
      // Inherit stroke from path.
      .attr('stroke', 'context-stroke')
      .attr(
        'd',
        createLine([
          start ? [length, height] : [-length, -height],
          [0, 0],
          start ? [length, -height] : [-length, height],
        ]),
      );
  };

const createDot =
  (size: number): D3Callable =>
  (el) => {
    el.attr('markerWidth', size * 2)
      .attr('markerHeight', size * 2)
      .attr('viewBox', `-${size},-${size},${size * 2},${size * 2}`)
      .attr('orient', 'auto')
      .append('circle')
      // Inherit stroke from path.
      .attr('fill', 'context-stroke')
      .attr('r', size / 2 - 1);
  };

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker
 * https://www.dashingd3js.com/svg-paths-and-d3js
 * http://bl.ocks.org/dustinlarimer/5888271
 */
export const createMarkers =
  ({ arrowSize = 12 }: MarkerOptions = {}): D3Callable =>
  (group) =>
    group
      .selectAll('marker')
      .data([
        {
          id: 'marker-arrow-start',
          generator: createArrow(arrowSize, -0.5, true),
          className: 'dx-arrow',
        },
        {
          id: 'marker-arrow-end',
          generator: createArrow(arrowSize, 0.5, false),
          className: 'dx-arrow',
        },
        {
          id: 'marker-dot',
          generator: createDot(6),
          className: 'dx-dot',
        },
      ])
      .join('marker')
      .attr('id', (d) => d.id)
      .attr('markerUnits', 'strokeWidth')
      .attr('class', (d) => d.className)
      .each((d, i, nodes) => {
        select(nodes[i]).call(d.generator);
      });
