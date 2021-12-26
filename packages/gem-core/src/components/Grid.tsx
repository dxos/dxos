//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import styled from '@emotion/styled'

import { GridType } from '../util';

const GridGroup = styled.g`
  path {
    stroke-width: 0;
  }
  line {
    stroke: #CCC;
    stroke-width: 1;
  }
`;

const AxisGroup = styled.g`
  line {
    stroke: #333;
    stroke-width: 1;
  }
  text {
    fill: #333;
    stroke-width: .5;
  }
`;

interface GridOptions {
  grid: GridType;
  showGrid?: boolean;
  showAxis?: boolean;
  tickFormat?: string;
}

/**
 * Grid component with optional axes.
 *
 * https://github.com/d3/d3-axis
 * https://bl.ocks.org/d3noob/c506ac45617cf9ed39337f99f8511218
 * https://engineering.velocityapp.com/building-a-grid-ui-with-d3-js-v4-p1-c2da5ed016 (zoom)
 *
 * NOTE: Specify either a grid object, or width and height.
 */
export const Grid = ({ grid, showGrid = true, showAxis = false }: GridOptions) => {
  const { size, scaleX, scaleY, ticks } = grid;

  const xAxisRef = useRef(null);
  const yAxisRef = useRef(null);
  const xGridRef = useRef(null);
  const yGridRef = useRef(null);

  useEffect(() => {
    if (showAxis) {
      d3.select(xAxisRef.current)
        .call(d3.axisBottom(scaleX)
          .ticks(ticks) as any);

      d3.select(yAxisRef.current)
        .call(d3.axisLeft(scaleY)
          .ticks(ticks) as any);
    }

    // NOTE: Hack to use axis ticks to draw lines.
    if (showGrid) {
      d3.select(xGridRef.current)
        .attr('transform', `translate(0, ${-size.height / 2})`)
        .call(d3.axisBottom(scaleX)
          .ticks(ticks)
          .tickSize(size.height));

      d3.select(yGridRef.current)
        .attr('transform', `translate(${-size.width / 2}, 0)`)
        .call(d3.axisRight(scaleY)
          .ticks(ticks)
          .tickSize(size.width));
    }
  }, [grid, showGrid, showAxis]);

  return (
    <g>
      {showGrid && (
        <GridGroup>
          <g ref={xGridRef} />
          <g ref={yGridRef} />
        </GridGroup>
      )}

      {showAxis && (
        <AxisGroup>
          <g ref={xAxisRef} />
          <g ref={yAxisRef} />
        </AxisGroup>
      )}
    </g>
  );
};
