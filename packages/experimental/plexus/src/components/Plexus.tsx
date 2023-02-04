//
// Copyright 2023 DXOS.org
//

import * as d3 from 'd3';
import faker from 'faker';
import React, { useEffect, useMemo, useRef } from 'react';

import { Grid, Point, SVG, SVGContextProvider, Zoom, useSvgContext } from '@dxos/gem-core';
import { Markers, convertTreeToGraph, createTree, TestGraphModel } from '@dxos/gem-spore';

export type PlexusParam = {
  data?: object;
};

// TODO(burdon): Test click and transition.

export const Plexus = ({ data }: PlexusParam) => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  return (
    <SVGContextProvider>
      <SVG className='bg-slate-800'>
        <Markers />
        <Grid axis className='bg-black [&>path]:stroke-slate-700' />
        <Zoom extent={[1, 4]}>
          {/* <GemGraph model={model} drag arrows /> */}
          <Demo />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};

//
// Data
//

type Node = {
  id: string;
};

type Link = {
  soruce: string;
  target: string;
}

type Graph = {
  nodes: Node[];
  links: Link[];
}

// TODO(burdon): Generate from core.
const data = {
  nodes: [
    { id: 'item-1' },
    { id: 'item-2' },
    { id: 'item-3' },
    { id: 'item-4' },
    { id: 'item-5' },
    { id: 'item-6' },
    { id: 'item-7' }
  ],
  links: [
    { source: 'item-1', target: 'item-2' },
    { source: 'item-1', target: 'item-3' },
    { source: 'item-2', target: 'item-4' },
    { source: 'item-2', target: 'item-5' },
    { source: 'item-2', target: 'item-6' },
    { source: 'item-3', target: 'item-7' }
  ]
};

//
// Geometry
//

class Layout {
  private readonly points = new Map<string, Point>();

  update(graph: Graph) {
    const r = 240;
    graph.nodes.forEach(node => this.points.set(node.id, [
      faker.datatype.number({ min: -r, max: r }),
      faker.datatype.number({ min: -r, max: r })
    ]))
  }
}

class Renderer {
  // TODO(burdon): Tick or same transition time for lines.
  // TODO(burdon): Update path during transition.
  // https://github.com/d3/d3-transition/blob/main/README.md#transition_tween
  render(el: SVGElement, layout: Layout, transition = false) {
    const line = d3.line();

    // TODO(burdon): Set initial positions; conditional transition.
    const t = d3.transition().duration(500).ease(d3.easeSinOut);

    const center = (d, i, nodes) => {
      let selection = d3.select(nodes[i]);
      if (transition) {
        selection = selection.transition(t)
      }

      const [x, y] = layout.points.get(d.id);
      selection
        .attr('cx', x)
        .attr('cy', y);
    }

    const path = (d, i, nodes) => {
      let selection = d3.select(nodes[i]);
      if (transition) {
        selection = selection.transition(t)
      }

      const points = line([layout.points.get(d.source), layout.points.get(d.target)]);
      selection
        .attr('d', points);
    }

    d3.select(el)
      .selectAll('circle')
      .each(center);

    d3.select(el)
      .selectAll('path')
      .each(path);
  }
}

const layout = new Layout();
const renderer = new Renderer();

const Demo = () => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();

  // https://github.com/d3/d3-transition
  const handleClick = (event, id) => {
    doUpdate(true);
  }

  const doUpdate = (transition = false) => {
    layout.update(data);
    renderer.render(graphRef.current, layout, transition);
  };

  useEffect(() => {
    const r = 20;

    d3.select(graphRef.current)
      .selectAll('circle')
      .data(data.nodes)
      .join((enter) => enter.append('circle').attr('r', r))
      .on('click', handleClick);

    d3.select(graphRef.current)
      .selectAll('path')
      .data(data.links)
      .join((enter) => enter.append('path'))

    doUpdate();
  }, []);

  return <g
    ref={graphRef}
    className='[&>circle]:fill-slate-300 [&>path]:stroke-[4px] [&>path]:stroke-slate-300'
  />;
};
