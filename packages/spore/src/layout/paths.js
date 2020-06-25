//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker
 * https://www.dashingd3js.com/svg-paths-and-d3js
 * http://bl.ocks.org/dustinlarimer/5888271
 *
 * @param arrowSize
 * @return {function(*): null|undefined}
 */
export const createArrowMarkers = ({ arrowSize = 32 } = {}) => group =>
  group
    .selectAll('marker')
      .data([
        {
          name: 'arrow',
          path: 'M -6,-4 L 0,0 L -6,+4',
          viewbox: '-6 -4 12 8'
        }
      ])
      .join('marker')
        .attr('id', d => 'marker_' + d.name)
        .attr('markerHeight', arrowSize)
        .attr('markerWidth', arrowSize)
        .attr('markerUnits', 'strokeWidth')
        .attr('orient', 'auto')
        .attr('refX', 0)
        .attr('refY', 0)
        .attr('viewBox', d => d.viewbox)
        .append('path')
          .attr('d', d => d.path)
          .attr('class', 'arrow');

/**
 * Creates an array of points on the the circumference of two nodes.
 * http://www.math.com/tables/geometry/circles.htm
 *
 * @param source
 * @param target
 * @param sourceSize
 * @param targetSize
 * @return {[{ x, y }]}
 */
export const createPoints = (source, target, sourceSize, targetSize) => {
  let angle = Math.atan2(target.x - source.x, target.y - source.y);
  return [
    {
      x: source.x + sourceSize *  Math.sin(angle),
      y: source.y - sourceSize * -Math.cos(angle)
    },
    {
      x: target.x + targetSize * -Math.cos(Math.PI / 2 - angle),
      y: target.y - targetSize *  Math.sin(Math.PI / 2 - angle)
    }
  ];
};

export const lineGenerator = d3.line()
  .x(d => d.x || 0)
  .y(d => d.y || 0);
