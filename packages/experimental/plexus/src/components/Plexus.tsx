//
// Copyright 2023 DXOS.org
//

import * as d3 from 'd3';
import faker from 'faker';
import React, { useEffect, useMemo, useRef } from 'react';

import { Grid, Point, SVG, SVGContextProvider, Zoom, useSvgContext } from '@dxos/gem-core';
import { Markers, convertTreeToGraph, createTree, TestGraphModel } from '@dxos/gem-spore';
import { mx } from '@dxos/react-components';
import { range } from '@dxos/util';

export type PlexusParam = {
  data?: object;
};

// TODO(burdon): Generate typed tree data.
// TODO(burdon): Layout around focused element (up/down); hide distant items.
//  - foucs, inner ring of separated typed-collections, collection children (evenly spaced like dendrogram).
//  - large collections (scroll/zoom/lens?)
//  - square off leaf nodes (HTML list blocks) with radial lines into circles
//  - card on left; related cards on right
//  - search
// TODO(burdon): Standardize Layout, Renderer.

export const Plexus = ({ data }: PlexusParam) => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  return (
    <SVGContextProvider>
      <SVG className='bg-slate-800'>
        <Markers />
        {/* <Grid axis className='bg-black [&>path]:stroke-slate-700' /> */}
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

const generate = (): Graph => {
  const graph = {
    nodes: range(faker.datatype.number({ min: 10, max: 40 })).map(() => ({ id: faker.datatype.uuid() })),
    links: []
  };

  range(faker.datatype.number({ min: 8, max: 16 })).forEach(() => {
    const [source, target] = faker.random.arrayElements(graph.nodes, 2);
    if (source !== target) {
      graph.links.push({ source: source.id, target: target.id });
    }
  });

  return graph;
};

class Layout {
  private readonly points = new Map<string, Point>();
  private r = 240;
  private _selected?: Node;

  get selected() {
    return this._selected;
  }

  update(graph: Graph, selected?: Node) {
    this._selected = selected;
    if (selected) {
      this.points.set(selected.id, [0, 0]);
    }

    graph.nodes
      .filter(node => (node.id !== selected?.id))
      .forEach(node => {
        const a = faker.datatype.float({ min: -Math.PI * .3, max: Math.PI * .3 }) + (faker.datatype.boolean() ? 0 : Math.PI);
        this.points.set(node.id, [Math.sin(a) * this.r * 1, -Math.cos(a) * this.r]);
      });
  }
}

class Renderer {
  // TODO(burdon): Options.
  private r = 16;
  private delay = 600;

  update(el: SVGElement, data: Graph, onClick: (node: Node) => void) {
    const handleClick = (event, node) => {
      onClick(node);
    }

    d3.select(el)
      .selectAll('path')
      .data(data.links)
      .join(
              (enter) => enter.append('path'),
              (update) => update,
              (exit) => exit.remove()
              );

    d3.select(el)
      .selectAll('circle')
      .data(data.nodes)
      .join(
              (enter) => enter.append('circle').on('click', handleClick),
              (update) => update,
              (exit) => exit.remove()
              );
  }

  render(el: SVGElement, layout: Layout, transition = false) {
    const t = d3.transition().duration(this.delay).ease(d3.easeSinOut);

    const center = (d, i, nodes) => {
      let selection = d3.select(nodes[i]);
      if (transition) {
        selection = selection.transition(t)
      }

      const [x, y] = layout.points.get(d.id);
      selection
        .attr('r', d.id === layout.selected?.id ? 3 * this.r : this.r)
        .attr('cx', x)
        .attr('cy', y);
    }

    const line = d3.line();
    const path = (d, i, nodes) => {
      let selection = d3.select(nodes[i]);
      if (transition) {
        selection = selection.transition(t)
      }

      selection
        .attr('d', line([layout.points.get(d.source), layout.points.get(d.target)]));
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

const data = generate();

const Demo = () => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();

  const handleSelect = (id) => {
    layout.update(data, id);
    renderer.render(graphRef.current, layout, true);
  }

  useEffect(() => {
    layout.update(data);
    renderer.update(graphRef.current, data, handleSelect);
    renderer.render(graphRef.current, layout);
  }, []);

  return <g
    ref={graphRef}
    className={mx(
            '[&>circle]:fill-slate-800 [&>circle]:stroke-[2px] [&>circle]:stroke-slate-300',
            '[&>path]:stroke-[3px] [&>path]:stroke-slate-500'
            )}
  />;
};
