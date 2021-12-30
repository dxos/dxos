//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import useResizeAware from 'react-resize-aware';
import styled from '@emotion/styled'

import { createPath, FullScreen, Point, SVG } from '../src';

export default {
  title: 'Logos'
};

import { DxosIconPath } from './icons';

const MeshGroup = styled.g`
  stroke: #FCC;
  stroke-width: .5;
  fill: none;
`;

const LogoGroup = styled.g`
  stroke: #333;
  stroke-width: 2;
  fill: #AAA;
  fill-opacity: .1;
`;

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

export const Icon = () => {
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
        <MeshGroup ref={meshGroup} />
        <LogoGroup ref={logoGroup} />
      </SVG>
    </FullScreen>
  );
};

export const Spinner = () => {
  const [resizeListener, size] = useResizeAware();
  const group1 = useRef(null);
  const group2 = useRef(null);

  useEffect(() => {
    if (size.width === null || size.height === null) {
      return;
    }

    d3.select(group1.current)
      .attr('transform', 'translate(-128, -128)')
      .append('path')
      .attr('d', DxosIconPath)
      .attr('fill', '#EEEEEE');

    d3.select(group2.current)
      .attr('transform-origin', '128 128')
      .attr('transform', 'translate(-128, -128)')
      .append('path')
      .attr('d', DxosIconPath)
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
