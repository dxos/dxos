//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import * as colors from '@material-ui/core/colors';

const useStyles = makeStyles(() => ({
  root: {},
  arrow: ({ color = 'grey' }) => ({
    fill: 'none',
    strokeWidth: 1,
    stroke: colors[color][500],
  })
}));

/**
 * Markers include elements such as arrow-heads.
 * @param arrowSize
 * @param classes
 * @returns {JSX.Element}
 * @constructor
 */
export const Markers = ({ arrowSize = 16 }) => {
  const classes = useStyles();
  const markers = useRef();

  // Arrows markers.
  useEffect(() => {
    d3.select(markers.current).call(createArrowMarkers({ arrowSize, classes }));
  }, []);

  return (
    <g ref={markers} className={classes.root} />
  );
};

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker
 * https://www.dashingd3js.com/svg-paths-and-d3js
 * http://bl.ocks.org/dustinlarimer/5888271
 *
 * @param arrowSize
 * @param classes
 * @return {function(*): null|undefined}
 */
export const createArrowMarkers = ({ arrowSize = 16, classes } = {}) => group => {
  const n = arrowSize;
  const m = n * 2/3;
  const points = [[-n, -m], [0, 0], [-n, m]];

  return group
    .selectAll('marker')
      .data([
        {
          name: 'arrow',
          path: 'M' + points.map(p => p.join(',')).join(' L'),
          viewbox: `-${n} -${n} ${n * 2} ${n * 2}`
        }
      ])
      .join('marker')
        .attr('id', d => 'marker_' + d.name)
        .attr('markerHeight', arrowSize * 2)
        .attr('markerWidth', arrowSize * 2)
        .attr('markerUnits', 'strokeWidth')
        .attr('orient', 'auto')
        .attr('refX', 0)
        .attr('refY', 0)
        .attr('viewBox', d => d.viewbox)
        .append('path')
          .attr('d', d => d.path)
          .attr('class', classes?.arrow);
};

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

/**
 * Convert datum (x, y) into SVG line.
 */
export const lineGenerator = d3.line()
  .x(d => d.x || 0)
  .y(d => d.y || 0);
