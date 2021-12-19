//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';

import { BaseProjector, ObjectId, Renderer, Surface } from './scene';

export type GraphNode = {
  id: ObjectId
  x?: number
  y?: number
  r?: number
}

export type GraphLink = {
  id: string
  source: GraphNode
  target: GraphNode
}

export type Graph = {
  nodes: GraphNode[]
  links: GraphLink[]
}

export class GraphRenderer implements Renderer<Graph> {
  update (surface: Surface, layout: Graph) {
    console.log('GraphRenderer.update', JSON.stringify(layout, undefined, 2));
    const root = d3.select(surface.root);
    const circles = root.selectAll('g.nodes')
      .data([{ id: 'nodes' }])
      .join('g').classed('nodes', true);
    circles.selectAll('circle')
      .data(layout.nodes)
      .join('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r);

    const links = root.selectAll('g.links')
      .data([{ id: 'links' }])
      .join('g').classed('links', true);
    links.selectAll('path')
      .data(layout.links)
      .join('path')
      .attr('d', d => {
        return d3.line()([
          [d.source.x, d.source.y],
          [d.target.x, d.target.y]
        ]);
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clear (surface: Surface) {
    console.log('GraphRenderer.clear');
  }
}

export class GraphForceProjector<MODEL> extends BaseProjector<MODEL, Graph> {
  _layout: Graph = {
    nodes: [],
    links: []
  }

  protected getLayout (): Graph {
    return this._layout;
  }

  onUpdate (layout: Graph) {
    this._layout = layout;
    this._layout.nodes.forEach(node => {
      if (node.x === undefined) {
        node.x = (Math.random() - 0.5) * 300;
      }
      if (node.y === undefined) {
        node.y = (Math.random() - 0.5) * 300;
      }
      if (node.r === undefined) {
        node.r = 2 + Math.random() * 10;
      }
    });
  }

  onStart () {
    // TODO(burdon): On update callback.
    this.doUpdate();
  }

  async onStop () {}
}
