//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';

import { value } from '@dxos/gem-core';

import { Layout } from './layout';

/**
 * Creates layout from force simulation.
 *
 * https://github.com/d3/d3-force
 */
export class ForceLayout extends Layout {

  get defaults() {
    return {
      force: {
        gravity: {
          strength: .1
        },
        radial: {
          radius: 200,
          strength: .1
        },
        charge: {
          strength: -100
        },
        links: {
          distance: 20,

          // https://github.com/d3/d3-force#link_strength
          strength: (link /*, i, links*/) => {
            const count = () => 1;
            return 1 / Math.max(count(link.source), count(link.target));
          }
        }
      }
    };
  }

  // https://github.com/d3/d3-force
  _simulation = d3.forceSimulation().stop();

  get simulation() {
    return this._simulation;
  }

  _onReset() {
    this._simulation
      .on('tick', null)
      .nodes([])
      .stop();
  }

  _onUpdate(grid, data, context) {
    const { force } = this._options;
    const { nodes = [], links = [] } = data;
    const center = value(this._options.center)(grid);

    context.guides = [];

    // Merge nodes.
    const current = this._simulation.nodes();
    const merged = nodes.map(node => {
      const match = current.find(n => n.id === node.id);
      if (match) {
        // Merge force properties.
        const { x, y, vx, vy, fx, fy } = match;
        return Object.assign(node, { x, y, vx, vy, fx, fy });
      }

      Object.assign(node, {
        x: center.x + (Math.random() - 0.5) * force.radial?.radius || 20,
        y: center.y + (Math.random() - 0.5) * force.radial?.radius || 20,
        vx: null,
        vy: null
      });

      return node;
    });
    // TODO(burdon): Hack.
    data.nodes = merged;

    /**
     * https://github.com/d3/d3-force#simulation_on
     */
    this._simulation
      .on('tick', () => {
        this.emitUpdate(data);
      });

    /**
     * https://github.com/d3/d3-force#simulation_nodes
     * Updates each datum with { index, x, y, vx, vy, fx, fy }
     * NOTE: call before setting links.
     */
    this._simulation
      .nodes(merged);

    /**
     * https://github.com/d3/d3-force#link_links
     */
    if (force.links) {
      this._simulation.force('links', d3.forceLink(links).id(d => d.id)
        .strength(force.links.strength)
        .distance(force.links.distance)
      );
    }

    /**
     * https://github.com/d3/d3-force#forceCenter
     */
    if (force.gravity) {
      this._simulation.force('gravity', d3.forceCenter(center.x, center.y));
      // .strength(1));
    }

    /**
     * https://github.com/d3/d3-force#forceCollide
     */
    if (force.collide) {
      this._simulation.force('collide', d3.forceCollide())
    }

    /**
     * https://github.com/d3/d3-force#forceManyBody
     */
    // TODO(burdon): Strength accessor function can determine strength for each node separately.
    if (force.charge) {
      this._simulation.force('charge', d3.forceManyBody()
        .strength(force.charge.strength)
      )
    }

    /**
     * https://github.com/d3/d3-force#forceRadial
     */
    if (force.radial) {
      this._simulation.force('radial', d3.forceRadial(force.radial.radius, center.x, center.y)
        .strength(force.radial.strength)
      );

      context.guides.push({
        id: 'gravity',
        type: 'circle',
        cx: center.x,
        cy: center.y,
        r: force.radial.radius
      });
    }

    const start = true;
    if (start) {
      // TODO(burdon): Alpha?
      // https://github.com/d3/d3-force#simulation_restart
      this._simulation.alphaTarget(0.3).restart();
    } else {
      this._simulation.tick();
    }
  }
}
