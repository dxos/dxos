//
// Copyright 2020 DXOS.org
//

import * as d3 from "d3";
import { Selection } from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/css';

import { FullScreen, SvgContainer } from '../src';

export default {
  title: 'SVG'
};

// TODO(burdon): Model class (and when to update).
// TODO(burdon): Scenes.
// TODO(burdon): Layout (e.g., force).
// TODO(burdon): Transitions (between scenes).

const circle = g => g
  .attr('cx', ([x,]) => x)
  .attr('cy', ([,y]) => y)
  .attr('r', 5);

const path = g => g
  .attr('d', path => path);

interface Data {
  type: 'circle' | 'path'
  data: any[]
  callback: (selection: Selection<Element, any, any, any>) => void
}

const createData = ({ r = 300 } = {}): Data[] => {
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

  return [
    {
      type: 'circle',
      data: circles,
      callback: circle
    },
    {
      type: 'path',
      data: paths,
      callback: path
    }
  ];
};

// TODO(burdon): Size?
const gridPath = () => {
  const range = d3.range(-40*32, 40*32, 32);
  const lines = range.reduce((result, i) => {
    result.push([[-1000, i], [1000, i]]);
    result.push([[i, -1000], [i, 1000]]);
    return result;
  }, []);

  return lines.map(line => d3.line()(line)).join();
};

const style = css`
  g.axis {
    path {
      stroke: #DDD;
    }
  }

  // TODO(burdon): Custom style.
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
  const data = useMemo(() => createData(), []);

  // TODO(burdon): When to draw?
  useEffect(() => {
    const root = d3.select(ref.current)
      .append('g');

    // Grid.
    // TODO(burdon): Is the grid special?
    root.append('g').classed('axis', true)
      .append('path')
      .attr('d', gridPath());

    // Objects.
    const objects = root.append('g').classed('objects', true);
    data.forEach(({ type, data, callback }) => {
      objects.append('g')
        .selectAll(type) // TODO(burdon): Selector (datum/property value?)
          .data(data)
        .join(type)
          .call(callback);
    });
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

    // TODO(burdon): Determine what to scale.
    // TODO(burdon): Custom: e.g., scale color, size of grid spacing, etc.
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
