//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import useResizeAware from 'react-resize-aware';

import { withKnobs } from '@storybook/addon-knobs';

import { createPath, FullScreen, SVG } from '../src';

export default {
  title: 'Logos',
  decorators: [withKnobs]
};

import { makeStyles } from '@material-ui/core';

import { Point, FoldData } from '../src';

// https://www.w3.org/TR/SVG/propidx.html
const useStyles = makeStyles(() => ({
  mesh: {
    stroke: '#FCC',
    strokeWidth: .5,
    fill: 'none',
  },

  group: {
    stroke: '#333',
    strokeWidth: 2,
    fill: '#AAA',
    fillOpacity: .1
  }
}));

// TODO(burdon): Create mesh.
const mesh: any[] = [];
for (let x = -10; x < 10; x++) {
  for (let y = -10; y < 10; y++) {
    mesh.push([
      { x: x * 8,       y: y * 6 - 6 },
      { x: x * 8 + -8,  y: y * 6 - 6 },
      { x: x * 8 + -0,  y: y * 6 + 6 },
      { x: x * 8 + -8,  y: y * 6 + 6 },
      { x: x * 8,       y: y * 6 - 6 },
    ]);
  }
}

const points1 = [
  [
    { x: 0, y: 0 },
    { x: -4, y: 0 },
  ],
  [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
  ],
  [
    { x: 0, y: -6 },
    { x: -8, y: -6 },
    { x: 0, y: 6 },
  ],
  [
    { x: 0, y: -6 },
    { x: 8, y: -6 },
    { x: 0, y: 6 },
  ],
  [
    { x: 0, y: -6 },
    { x: -8, y: 6 },
    { x: 0, y: 6 },
  ],
  [
    { x: 0, y: -6 },
    { x: 8, y: 6 },
    { x: 0, y: 6 },
  ],
];

const points2 = [
  [
    { x: 0, y: 0 },
    { x: 0, y: 6 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0, y: -6 },
  ],
  [
    { x: 0, y: -6 },
    { x: -14, y: -15 },   // TL
    { x: 0, y: 6 },
  ],
  [
    { x: 0, y: -6 },
    { x: 14, y: -15 },    // TR
    { x: 0, y: 6 },
  ],
  [
    { x: 0, y: -6 },
    { x: -14, y: 15 },    // BL
    { x: 0, y: 6 },
  ],
  [
    { x: 0, y: -6 },
    { x: 14, y: 15 },     // BR
    { x: 0, y: 6 },
  ],
];

const points = [
  points1,
  points2,
];

export const withFold = () => {
  const classes = useStyles();
  const [resizeListener, size] = useResizeAware();
  const meshGroup = useRef(null);
  const logoGroup = useRef(null);

  useEffect(() => {
    if (size.width === null || size.height === null) {
      return;
    }

    const scale = 12;

    d3
      .select(meshGroup.current)
      .selectAll('path')
      .data(mesh)
      .join('path')
      .attr('d', d => createPath(d.map(({ x, y }: Point) => ({ x: x * scale, y: y * scale }))));

    let i = 0;
    const render = (i: number) => {
      d3
        .select(logoGroup.current)
        .selectAll('path')
        .data(points[i])
        .join('path')
        .transition()
        .duration(500)
        .attr('d', d => createPath(d.map(({ x, y }: Point) => ({ x: x * scale, y: y * scale }))));
    };

    render(i++);
    const t = d3.interval(() => {
      render(i);
      if (++i === points.length ) {
        i = 0;
      }
    }, 3000);

    return () => t.stop();
  }, [logoGroup, size]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width || 0} height={size.height || 0}>
        <g ref={meshGroup} className={classes.mesh} />
        <g ref={logoGroup} className={classes.group} />
      </SVG>
    </FullScreen>
  );
};

export const withLogo = () => {
  const [resizeListener, size] = useResizeAware();
  const group1 = useRef(null);
  const group2 = useRef(null);

  useEffect(() => {
    if (size.width === null || size.height === null) {
      return;
    }

    // TODO(burdon): Import size.

    d3.select(group1.current)
      .attr('transform', 'translate(-128, -128)')
      .append('path')
      .attr('d', FoldData)
      .attr('fill', '#EEEEEE');

    d3.select(group2.current)
      .attr('transform-origin', '128 128')
      .attr('transform', 'translate(-128, -128)')
      .append('path')
      .attr('d', FoldData)
      .attr('fill', '#333333');

    const i = d3.interval(() => {
      const deg = Math.random() * 360;
      d3.select(group2.current)
        .transition()
        .duration(500)
        .attr('transform', `translate(-128, -128) rotate(${deg})`)
        .transition()
        .duration(500)
        .attr('transform', 'translate(-128, -128) rotate(0)');
    }, 2000);

    return () => i.stop();
  }, [group1, group2, size]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width || 0} height={size.height || 0}>
        <g ref={group1} />
        <g ref={group2} />
      </SVG>
    </FullScreen>
  );
};
