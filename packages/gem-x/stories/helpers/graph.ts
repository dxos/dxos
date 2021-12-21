//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';

import { createSimulationDrag } from './drag';
import { ObjectId, Projector, RenderOptions, Renderer, Surface } from './scene';

export type GraphNode = {
  initialized?: boolean
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

const line = d3.line();

export class GraphRenderer implements Renderer<Graph> {
  update (surface: Surface, layout: Graph, options: RenderOptions = {}) {
    const { drag } = options;

    const root = d3.select(surface.root);

    const links = root.selectAll('g.links')
      .data([{ id: 'links' }])
      .join('g').classed('links', true);
    links.selectAll('path')
      .data(layout.links || [])
      .join('path')
      .attr('d', d => {
        if (!d.source.initialized || !d.target.initialized) {
          return;
        }

        return line([
          [d.source.x, d.source.y],
          [d.target.x, d.target.y]
        ]);
      });

    const circles = root.selectAll('g.nodes')
      .data([{ id: 'nodes' }])
      .join('g').classed('nodes', true);
    circles.selectAll('circle')
      .data(layout.nodes || [])
      .join('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r);

    if (drag) {
      circles.selectAll('circle')
        .call(drag);
    }
  }
}

export class GraphForceProjector<MODEL> extends Projector<MODEL, Graph> {
  // https://github.com/d3/d3-force
  _simulation = d3.forceSimulation();

  _drag = createSimulationDrag(this._simulation);

  _layout: Graph = {
    nodes: [],
    links: []
  }

  protected getLayout () {
    return this._layout;
  }

  onUpdate (layout: Graph) {
    this._layout = layout;

    // Iniital positions.
    this._layout.nodes.forEach(node => {
      if (!node.initialized) {
        Object.assign(node, {
          initialized: true,
          x: (Math.random() - 0.5) * 300,
          y: (Math.random() - 0.5) * 300,
          r: 2 + Math.random() * 10
        });
      }
    });

    // TODO(burdon): Only reset alpha if model has changed.
    // https://github.com/d3/d3-force#simulation_force
    this._simulation
      .nodes(this._layout.nodes)
      .force('link', d3.forceLink(this._layout.links).distance(40))
      .force('charge', d3.forceManyBody().strength(-30))
      .alpha(1) // Reset calculations.
      .restart();
  }

  onStart () {
    this._simulation.on('tick', () => {
      this.events.emit('update', { layout: this._layout, options: { drag: this._drag } });
    });

    this._simulation.restart();
  }

  async onStop () {
    this._simulation.stop();
  }
}
