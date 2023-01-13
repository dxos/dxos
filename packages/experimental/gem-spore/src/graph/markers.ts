//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';

import { D3Callable } from '@dxos/gem-core';

export type MarkerOptions = {
  arrowSize?: number;
};

const createArrow =
  (length: number, offset: number, start: boolean): D3Callable =>
  (el) => {
    const height = length * 0.5;
    const path = d3.line()([
      start ? [length, height] : [-length, -height],
      [0, 0],
      start ? [length, -height] : [-length, height]
    ]);

    el.attr('markerWidth', length * 2)
      .attr('markerHeight', height * 2)
      .attr('viewBox', `-${length},-${height},${length * 2},${height * 2}`)
      .attr('orient', 'auto')
      .attr('refX', offset)
      .append('path')
      .attr('d', path);
  };

const createDot =
  (size: number): D3Callable =>
  (el) => {
    el.attr('markerWidth', size * 2)
      .attr('markerHeight', size * 2)
      .attr('viewBox', `-${size},-${size},${size * 2},${size * 2}`)
      .attr('orient', 'auto')
      .append('circle')
      .attr('r', size / 2 - 1);
  };

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker
 * https://www.dashingd3js.com/svg-paths-and-d3js
 * http://bl.ocks.org/dustinlarimer/5888271
 */
export const createMarkers =
  ({ arrowSize = 12 }: MarkerOptions = {}): D3Callable =>
  (group) => {
    return group
      .selectAll('marker')
      .data([
        {
          id: 'marker-arrow-start',
          generator: createArrow(arrowSize, -0.5, true),
          className: 'arrow'
        },
        {
          id: 'marker-arrow-end',
          generator: createArrow(arrowSize, 0.5, false),
          className: 'arrow'
        },
        {
          id: 'marker-dot',
          generator: createDot(8),
          className: 'dot'
        }
      ])
      .join('marker')
      .attr('id', (d) => d.id)
      .attr('markerUnits', 'strokeWidth')
      .attr('class', (d) => d.className)
      .each((d, i, nodes) => {
        d3.select(nodes[i]).call(d.generator);
      });
  };
