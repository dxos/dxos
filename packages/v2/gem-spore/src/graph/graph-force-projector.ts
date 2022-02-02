//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';

import { GraphLayout, GraphNode } from '../graph';
import { Projector } from '../scene';

const maybe = (condition, f) => condition ? f() : undefined;
const value = <T extends any> (v: T | boolean): T => typeof v === 'boolean' ? undefined : v;

type LinkOptions = {
  distance: number
}

type ChargeOptions = {
  distanceMax?: number
}

type GraphForceProjectorOptions = {
  forces?: {
    link?: boolean | LinkOptions
    charge?: boolean | ChargeOptions
    center?: boolean
    collide?: boolean
  }
}

/**
 * D3 force layout.
 */
export class GraphForceProjector<MODEL> extends Projector<MODEL, GraphLayout, GraphForceProjectorOptions> {
  // https://github.com/d3/d3-force
  _simulation = d3.forceSimulation();

  // Force-specific drag handler.
  _drag = createSimulationDrag(this._simulation);

  // Current layout.
  _layout: GraphLayout

  protected getLayout () {
    return this._layout;
  }

  onUpdate (layout: GraphLayout) {
    this._layout = layout;

    // Guides.
    this._layout.guides = {
      circles: [
        {
          cx: 0,
          cy: 0,
          r: 240 // TODO(burdon): Use scale.
        }
      ]
    };

    const count = (node) => this._layout.graph.links.filter(link => link.source.id === node.id).length;

    // Merge nodes.
    this._layout.graph.nodes.forEach(node => {
      if (!node.initialized) {
        const parent = this._layout.graph.nodes.find(n => n.id === node?.data.parent);

        // Iniital positions.
        Object.assign(node, {
          initialized: true,
          // Position around center or parent; must have delta to avoid spike.
          x: (parent?.x || 0) + (Math.random() - 0.5) * 30,
          y: (parent?.y || 0) + (Math.random() - 0.5) * 30
        });
      }

      const children = count(node);
      Object.assign(node, {
        children,
        r: 5 + children * 2
      });
    });

    // https://github.com/d3/d3-force#simulation_force
    const forces = this.options.forces;

    this._simulation
      // Nodes
      // https://github.com/d3/d3-force#simulation_nodes
      .nodes(this._layout.graph.nodes)

      // Links.
      // https://github.com/d3/d3-force#forceLink
      .force('link', maybe(forces?.link !== false, () => d3.forceLink(this._layout.graph.links)
        // .strength(link => 1 / Math.min(2, count(link.source), count(link.target)))
        .distance(value<LinkOptions>(forces?.link)?.distance ?? 20)
      ))

      .alpha(0.4);
  }

  onStart () {
    this.updateForces();

    this._simulation
      .on('tick', () => {
        this.updated.emit({ layout: this._layout, options: { drag: this._drag } });
      })
      .alpha(0.7) // Default 0.4
      .restart();
  }

  async onStop () {
    this._simulation.stop();
  }

  private updateForces () {
    const forces = this.options.forces;

    // https://github.com/d3/d3-force#simulation_force
    this._simulation

      // Repulsion.
      // https://github.com/d3/d3-force#forceManyBody
      .force('charge', maybe(forces?.charge !== false, () => d3.forceManyBody()
        .distanceMax(value<ChargeOptions>(forces?.charge)?.distanceMax ?? 240)
        .strength((d: GraphNode<any>) => {
          return -60 - (Math.log(d.data.children.length + 1) * 3);
        })
      ))

      // Centering.
      // https://github.com/d3/d3-force#centering
      .force('center', maybe(forces?.center, () => d3.forceCenter()
        .strength(0.7)
      ))

      // Collision
      // https://github.com/d3/d3-force#forceCollide
      .force('collide', maybe(forces?.collide, () => d3.forceCollide()
        .strength(0.5)
      ))

      // Radial
      // https://github.com/d3/d3-force#forceRadial
      // .force('radial', d3.forceRadial(240).strength(0.1))

      // Positioning
      // https://github.com/d3/d3-force#positioning
      // .force('y', d3.forceY(0).strength(0.01))

      .restart();
  }
}

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
      event.subject.fx = event.x;
      event.subject.fy = event.y;

      if (dragging) {
        // High alpha forces quick update.
        simulation.alphaTarget(0).alpha(1).restart();
      }

      dragging = true;
    })

    .on('end', function (event) {
      const { sourceEvent: { shiftKey } } = event;

      if (!shiftKey) {
        event.subject.fx = undefined;
        event.subject.fy = undefined;
      }

      // if (!dragging) {
      //   console.log('click');
      // }

      dragging = false;
    });
};
