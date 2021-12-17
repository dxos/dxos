//
// Copyright 2020 DXOS.org
//

import * as d3 from "d3";
import React, { useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/css';

import { FullScreen, SvgContainer } from '../src';

export default {
  title: 'SVG'
};

const createData = ({ r = 300 } = {}) => {
  const randomRadius = d3.randomInt(0, r);
  const circles = Array.from({ length: 500 }, () => {
    const r = randomRadius();
    const theta = Math.random() * 2 * Math.PI;
    return [Math.sin(theta) * r, Math.cos(theta) * r];
  });

  // https://css-tricks.com/svg-path-syntax-illustrated-guide
  const points: Iterable<[number, number]> = [[-128, -128], [-128, 128], [128, 128], [128, -128]];
  const paths = [
    d3.line()(points) + ',z' // Close path.
  ];

  return {
    circles,
    paths
  };
};

// TODO(burdon): Size?
const grid = (): [number, number][][] => {
  const range = d3.range(-40*32, 40*32, 32);
  return range.reduce((result, i) => {
    result.push([[-1000, i], [1000, i]]);
    result.push([[i, -1000], [i, 1000]]);
    return result;
  }, []);
};

const style = css`
  g.axis {
    path {
      stroke: #DDD;
    }
  }

  g.objects {
    circle {
      stroke: seagreen;
      fill: none;
    }
    path {
      stroke: orange;
      fill: none;
    }
  }
`

export const Primary = () => {
  const ref = useRef<SVGSVGElement>();
  const { circles, paths } = useMemo(() => createData(), []);

  useEffect(() => {
    const root = d3.select(ref.current)
      .append('g');

    // Axis.
    root.append('g').classed('axis', true)
      .append('path')
      .attr('d', grid().map(line => d3.line()(line)).join());

    // Objects.
    // TODO(burdon): Model (datum attr to select/join).
    const objects = root.append('g').classed('objects', true);

    const path = g => g
      .attr('d', paths => paths);

    objects.append('g')
      .selectAll('path')
        .data(paths)
      .join('path')
        .call(path);

    const circle = g => g
      .attr('cx', ([x,]) => x)
      .attr('cy', ([,y]) => y)
      .attr('r', 5);

    objects.append('g')
      .selectAll('circle')
        .data(circles)
      .join('circle')
        .call(circle);
  }, [ref]);

  const handleResize = (({ svg, width, height }) => {
    // TODO(burdon): Add momentum.
    // https://observablehq.com/@d3/zoom
    // https://www.d3indepth.com/zoom-and-pan
    d3.select(svg)
      .call(d3.zoom()
      .extent([[0, 0], [width, height]])
      .scaleExtent([1, 8])
      .on('zoom', zoomed));

    // TODO(burdon): Determine what to scale; scale color, etc.
    function zoomed({ transform }) {
      const { k } = transform;
      const scale = 1 / k;
      const g = d3.select(svg).select('g');
      g.attr('transform', transform);
      g.selectAll('path').attr('stroke-width', scale);
      g.selectAll('circle').attr('stroke-width', scale);
    }
  });

  return (
    <FullScreen style={{
      backgroundColor: '#F5F5F5'
    }}>
      <SvgContainer
        ref={ref}
        className={style}
        onResize={handleResize}
      />
    </FullScreen>
  );
}
