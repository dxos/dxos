//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';

import { Graph, GraphNode } from '../graph';
import { Projector } from '../scene';

/**
 * @param simulation
 */
export const createSimulationDrag = (simulation) => {
  let dragging = false;

  return d3.drag()
    .on('start', function () {
      dragging = false;
    })

    .on('drag', function (event) {
      dragging = true;

      event.subject.fx = event.x;
      event.subject.fy = event.y;

      simulation.alphaTarget(0).alpha(0.1).restart();
    })

    .on('end', function (event) {
      const { sourceEvent: { shiftKey } } = event;

      if (!shiftKey) {
        event.subject.fx = undefined;
        event.subject.fy = undefined;
      }

      if (!dragging) {
        console.log('select');
      }

      dragging = false;
    });
};

/**
 *
 */
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
        const parent = this._layout.nodes.find(n => n.id === node?.data.parent);

        Object.assign(node, {
          initialized: true,
          // Position around center or parent; must have delta to avoid spike.
          x: (parent?.x || 0) + (Math.random() - 0.5) * 30,
          y: (parent?.y || 0) + (Math.random() - 0.5) * 30,
          r: 2 + Math.random() * 10 // TODO(burdon): Update based on count.
        });
      }
    });

    // TODO(burdon): Only reset alpha if model has changed.
    // https://github.com/d3/d3-force#simulation_force
    this._simulation
      .nodes(this._layout.nodes)

      // https://github.com/d3/d3-force#forceLink
      .force('link', d3.forceLink(this._layout.links)
        // .strength(link => 1 / Math.min(count(link.source), count(link.target)))
        .distance(30))

      // https://github.com/d3/d3-force#forceManyBody
      .force('charge', d3.forceManyBody()
        .distanceMax(250)
        .strength((d: GraphNode) => {
          return -15 - (Math.log(d.data.children.length + 1) * 3);
        }))

      .alpha(0.5)
      .restart();
  }

  onStart () {
    this._simulation.on('tick', () => {
      this.updated.emit({ layout: this._layout, options: { drag: this._drag } });
    });

    this._simulation.restart();
  }

  async onStop () {
    this._simulation.stop();
  }
}
