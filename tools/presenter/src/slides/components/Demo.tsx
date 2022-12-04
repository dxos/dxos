//
// Copyright 2022 DXOS.org
//

// https://www.d3indepth.com/force-layout/

import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';

// import { Client } from '@dxos/client';
import { SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { convertTreeToGraph, createTree, Graph, Markers, TestGraphModel } from '@dxos/gem-spore';

// console.log(Client);

export const Spinner = () => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  return (
    <SVGContextProvider>
      <SVG>
        <Markers />
        <Zoom extent={[4, 8]}>
          <Graph model={model} drag arrows />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};

const width = 800;
const height = 1000;

const colorScale = ['orange', 'lightblue', '#B19CD9'];
const xCenter = [100, 300, 500];

const numNodes = 100;
const nodes = d3.range(numNodes).map((d, i) => ({
  radius: Math.random() * 25,
  category: i % 3
}));

// TODO(burdon): Start/stop.
const start = (on: boolean) => {
  // console.log(d3.select('svg'));

  const ticked = () => {
    d3.select('svg g')
      .selectAll('circle')
      .data(on ? nodes : [])
      .join('circle')
      .attr('r', (d) => d.radius)
      .style('fill', (d) => colorScale[d.category])
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y);
  };

  d3.forceSimulation(nodes)
    .force('charge', d3.forceManyBody().strength(2))
    .force(
      'x',
      d3.forceX().x((d) => xCenter[d.category])
    )
    .force(
      'collision',
      d3.forceCollide().radius((d) => d.radius * 2)
    )
    .on('tick', ticked);
};

export const Demo = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    start(true);
    return () => start(false);
  }, []);

  return (
    <div ref={containerRef} style={{ width, height }}>
      <svg id='content' style={{ width, height }}>
        <g transform={`translate(${width / 8}, ${height / 2})`}></g>
      </svg>
    </div>
  );
};

export default Demo;
