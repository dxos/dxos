//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import grey from '@material-ui/core/colors/grey';

const useStyles = makeStyles(() => ({
  axis: {
    '& line, & path': {
      stroke: grey[700],
      strokeWidth: 1
    },

    '& text': {
      fill: grey[500],
      strokeWidth: .5
    }
  },

  grid: {
    '& line, & path': {
      stroke: grey[200],
      strokeWidth: 1
    }
  }
}));

/**
 * Grid component with optional axes.
 *
 * https://github.com/d3/d3-axis
 * https://bl.ocks.org/d3noob/c506ac45617cf9ed39337f99f8511218
 * https://engineering.velocityapp.com/building-a-grid-ui-with-d3-js-v4-p1-c2da5ed016 (zoom)
 *
 * NOTE: Specify either a grid object, or width and height.
 *
 * @param grid
 * @param [showGrid]
 * @param [showAxis]
 * @param [tickFormat]
 */
const Grid = ({ grid, showGrid = true, showAxis = false, tickFormat }) => {
  const classes = useStyles();
  const { size, scaleX, scaleY, ticks } = grid;

  const xAxisRef = useRef();
  const yAxisRef = useRef();
  const xGridRef = useRef();
  const yGridRef = useRef();

  useEffect(() => {
    if (showAxis) {
      d3.select(xAxisRef.current)
        .call(d3.axisBottom(scaleX)
          .ticks(ticks)
          .tickFormat(tickFormat));

      d3.select(yAxisRef.current)
        .call(d3.axisLeft(scaleY)
          .ticks(ticks)
          .tickFormat(tickFormat));
    }

    // NOTE: Hack to use axis ticks to draw lines.
    if (showGrid) {
      d3.select(xGridRef.current)
        .attr('transform', `translate(0, ${-size.height / 2})`)
        .call(d3.axisBottom(scaleX)
          .ticks(ticks)
          .tickSize(size.height)
          .tickFormat(''));

      d3.select(yGridRef.current)
        .attr('transform', `translate(${-size.width / 2}, 0)`)
        .call(d3.axisRight(scaleY)
          .ticks(ticks)
          .tickSize(size.width)
          .tickFormat(''));
    }
  }, [grid, showGrid, showAxis]);

  return (
    <g>
      {showGrid && (
        <g className={classes.grid}>
          <g ref={xGridRef} />
          <g ref={yGridRef} />
        </g>
      )}

      {showAxis && (
        <g className={classes.axis}>
          <g ref={xAxisRef} />
          <g ref={yAxisRef} />
        </g>
      )}
    </g>
  );
};

export default Grid;
