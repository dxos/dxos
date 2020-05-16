//
// Copyright 2020 DxOS.org
//

import * as d3 from 'd3';
import faker from 'faker';
import React, { useEffect, useRef } from 'react';
import useResizeAware from 'react-resize-aware';

import {
  useGrid,
  FullScreen,
  Grid,
  SVG
} from '@dxos/gem-core';

import { useDefaultStyles } from '../src/layout';

export default {
  title: 'Disturbance'
};

const transform = (data, r, m = 1) => {
  const delta = (2 * Math.PI) / data.length;
  const points = data.map((d, i) => {
    const a = i * delta;
    const cr = r + d * m;
    return {
      x: Math.cos(a) * cr,
      y: Math.sin(a) * cr,
    };
  });

  points.push(points[0]);
  return points;
};

const rand = p => Math.min(1, Math.max(0, p + (Math.random() - .5) * .1));

const poly = points => points.map(p => `${p.x},${p.y}`).join(' ');

export const withAnomoly = () => {
  const classes = useDefaultStyles();
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });

  const points1 = useRef([...new Array(180)].map(() => 0));
  const points2 = useRef([...new Array(180)].map(() => 0));
  const points3 = useRef([...new Array(36)].map(() => 0));

  const polygon1 = useRef();
  const polygon2 = useRef();
  const polygon3 = useRef();

  const path = useRef();
  const text = useRef();

  const fontSize = 24;

  useEffect(() => {
    const t = d3.interval(() => {
      // TODO(burdon): Create stickiness.
      points1.current = points1.current.map(p => rand(p));
      points2.current = points2.current.map(p => rand(p));
      points3.current = points3.current.map(p => rand(p));

      const t1 = transform(points1.current, 320, 20);
      const t2 = transform(points2.current, 300, 20);
      const t3 = transform(points3.current, 295, 2);

      d3.select(polygon1.current).attr('points', poly(t1));
      d3.select(polygon2.current).attr('points', poly(t2));
      d3.select(polygon3.current).attr('points', poly(t3));
    }, 100);

    return () => t.stop();
  }, []);

  useEffect(() => {
    const t2 = transform(points2.current, 300, 20);
    const cities = [
      'London',
      'Paris',
      'Tokyo',
      'Los Angeles',
      'Berlin',
      'Shanghai',
    ];

    const t = d3.interval(() => {
      const p = faker.random.arrayElement(t2);

      const dx = (p.x > 0) ? 1 : -1;
      const dy = (p.y > 0) ? 1 : -1;

      d3.select(text.current)
        .attr('x', p.x + 130 * dx)
        .attr('y', p.y + 20 * dy + fontSize / 3)
        .attr('text-anchor', p.x > 0 ? 'start' : 'end')
        .text(`Divergence: ${faker.random.arrayElement(cities)}`);

      d3.select(path.current)
        .attr('d', `M${p.x},${p.y} L${p.x + 20 * dx},${p.y + 20 * dy} L${p.x + 120 * dx},${p.y + 20 * dy}`);
    }, 10000);

    return () => t.stop();
  }, []);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} showGrid={true} />
        <g className={classes.box}>
          <polyline ref={polygon1} fill="#EEE" stroke="#FFF" opacity={.5} />
          <polyline ref={polygon2} fill="#CCC" stroke="#666" opacity={.5} />
          <polyline ref={polygon3} fill="#FFF" stroke="#666" strokeWidth={1} />
          <path ref={path} stroke="#666" fill="none" />
          <text ref={text} stroke="#999" fontWeight="lighter" style={{ fontSize }} />
        </g>
      </SVG>
    </FullScreen>
  );
};
