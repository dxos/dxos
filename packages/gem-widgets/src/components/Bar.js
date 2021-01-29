//
// Copyright 2019 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

/**
 * Grid renderer.
 */
const Bar = ({ data, width, domain = [0, 100], delay = 0, barHeight = 16 }) => {
  const group = useRef();

  useEffect(() => {
    const x = d3.scaleLinear()
      .domain(domain)
      .range([0, width]);

    let i = 0;
    let rects = [];
    data.forEach(({ values }) => {
      if (values) {
        rects = rects.concat(values.map((value, n) => ({
          n,
          x: 0,
          y: i * barHeight + 1,
          width: x(value),
          height: barHeight - 2
        })));
      }

      i++;
    });

    const t = () => d3.transition()
      .duration(delay)
      .ease(d3.easePoly);

    d3.select(group.current)
      .selectAll('rect')
        .data(rects)
        .join('rect')
        .attr('id', d => d.id)
        .attr('class', ({ n }) => `value-${n}`)
        .attr('x', ({ x }) => x)
        .attr('y', ({ y }) => y)
        .attr('height', ({ height }) => height)
        .transition(t)
        .attr('width', ({ width }) => width);

  }, [data, barHeight]);

  return (
    <svg ref={group}/>
  );
};

export default Bar;
