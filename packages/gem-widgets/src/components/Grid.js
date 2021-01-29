//
// Copyright 2019 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(() => ({
  grid: {
    '& rect': {
      'fill': 'steelblue',
      'stroke': 'steelblue'
    }
  }
}));

/**
 * Grid renderer.
 */
const Grid = ({ data, delay = 0, grid = { x: 8, y: 8 }, padding = { x: 0, y: 0 } }) => {
  const classes = useStyles();
  const group = useRef();

  useEffect(() => {
    const t = () => d3.transition()
      .duration(delay)
      .ease(d3.easePoly);

    let offset = 0;
    data.forEach(({ x }) => { if (x > offset) offset = x; });

    d3.select(group.current)
      .selectAll('rect')
        .data(data)
      .join('rect')
        .attr('id', ({ x, y }) => `${x}_${y}`)
        .attr('x', ({ x }) => ((x - offset - 2) * (grid.x + padding.x)))
        .attr('y', ({ y }) => (y * (grid.y + padding.y)))
        .attr('width', grid.x - 1)
        .attr('height', grid.y - 1)
        .transition(t())
        .attr('x', ({ x }) => (x * (grid.x + padding.x)));

  }, [data]);

  return (
    <g ref={group} className={classes.grid}/>
  );
};

export default Grid;
