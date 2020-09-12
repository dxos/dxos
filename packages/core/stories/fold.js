//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import useResizeAware from 'react-resize-aware';
import { withKnobs } from '@storybook/addon-knobs';

import { FullScreen, SVG } from '../src/components';
import { createPath } from '../src/util';

export default {
  title: 'Fold',
  decorators: [withKnobs]
};

import { makeStyles } from '@material-ui/core';

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
const mesh = [];
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
  const { width, height } = size;
  const meshGroup = useRef();
  const logoGroup = useRef();

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
      .attr('d', d => createPath(d.map(({ x, y }) => ({ x: x * scale, y: y * scale }))));

    let i = 0;
    const render = i => {
      d3
        .select(logoGroup.current)
        .selectAll('path')
        .data(points[i])
        .join('path')
        .transition()
        .duration(500)
        .attr('d', d => createPath(d.map(({ x, y }) => ({ x: x * scale, y: y * scale }))));
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
      <SVG width={width} height={height}>
        <g ref={meshGroup} className={classes.mesh} />
        <g ref={logoGroup} className={classes.group} />
      </SVG>
    </FullScreen>
  );
};
