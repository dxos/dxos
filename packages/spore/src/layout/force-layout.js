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

  // https://github.com/d3/d3-force
  _simulation = d3.forceSimulation();

  // TODO(burdon): Don't automatically merge (otherwise cannot override).
  get defaults () {
    return {
      alphaTarget: .2,
      force: {
        center: {
          strength: .3
        },
        radial: {
          radius: 200,
          strength: .3
        },
        charge: {
          strength: -300
        },
        collide: {
          strength: .1
        },
        links: {
          distance: 30,

          // https://github.com/d3/d3-force#link_strength
          strength: (link /*, i, links*/) => {
            const count = () => 1;
            return 1 / Math.min(count(link.source), count(link.target));
          }
        }
      }
    };
  }

  get simulation () {
    return this._simulation;
  }

  _onReset () {
    this._simulation
      .on('tick', null)
      .nodes([])
      .stop();
  }

  _onUpdate (grid, data, context) {
    const { alphaTarget, force } = this._options;
    const center = value(this._options.center)(grid);

    // Guides.
    context.guides = [];

    // TODO(burdon): Don't mutate data set; instead attach data to nodes.
    data.nodes = this._mergeData(grid, data);

    // https://github.com/d3/d3-force#simulation_nodes
    this._simulation.stop().nodes(data.nodes);

    // Set forces.
    // https://github.com/d3/d3-force#simulation_force
    const forces = this._getForces(grid, data, context);
    Object.values(forces).forEach((value, key) => this._simulation.force(key, value));

    // https://github.com/d3/d3-force#simulation_restart
    // NOTE: Set alpha since data/forces have changed.
    this._simulation.alphaTarget(alphaTarget).restart();

    // https://github.com/d3/d3-force#simulation_on
    this._simulation.on('tick', () => {
      this.emitUpdate(data);
    });
  }

  /**
   * Merge data with existing nodes.
   * Updates each datum with { index, x, y, vx, vy, fx, fy }
   */
  _mergeData (grid, data) {
    const { force } = this._options;
    const center = value(this._options.center)(grid);
    const { nodes = [] } = data;

    // Merge nodes.
    const current = this._simulation.nodes();
    return nodes.map(node => {
      const match = current.find(n => n.id === node.id);
      if (match) {
        // Merge current force properties.
        // https://github.com/d3/d3-force#simulation_nodes
        const { x, y, vx, vy, fx, fy } = match;
        return Object.assign(node, { x, y, vx, vy, fx, fy });
      }

      // Initial properties.
      Object.assign(node, {
        // Random initial position (otherwise explodes)?
        x: center.x + (Math.random() - .5) * (force.radial?.radius || grid.width / 2),
        y: center.y + (Math.random() - .5) * (force.radial?.radius || grid.height / 2),
        vx: 0,
        vy: 0,
        fx: null,
        fy: null
      }, this._options.initializer && this._options.initializer(node, center));

      return node;
    });
  }

  _getForces (grid, data, context) {
    const { force } = this._options;
    const center = value(this._options.center)(grid);
    const { links = [] } = data;

    const forces = {
      collide: null,
      links: null,
      charge: null,
      center: null,
      radial: null
    };

    /**
     * https://github.com/d3/d3-force#forceCollide
     */
    if (force.collide) {
      forces.collide = d3.forceCollide()
        .strength(force.collide.strength);
    }

    /**
     * https://github.com/d3/d3-force#link_links
     */
    if (force.links) {
      forces.links = d3.forceLink(links)
        .id(d => d.id)
        .distance(force.links.distance)
        .strength(force.links.strength);
    }

    /**
     * https://github.com/d3/d3-force#forceManyBody
     */
    if (force.charge) {
      // TODO(burdon): Strength accessor function can determine strength for each node separately.
      forces.charge = d3.forceManyBody()
        .strength(force.charge.strength);
    }

    /**
     * https://github.com/d3/d3-force#forceCenter
     * NOTE: Opposes radial.
     */
    if (force.center) {
      forces.center = d3.forceCenter(center.x, center.y);
      // TODO(burdon): Bug. If strength is set after changing the center then center isn't updated?
      // .strength(force.center.strength)
    }

    /**
     * https://github.com/d3/d3-force#forceRadial
     * NOTE: Opposes center.
     */
    if (force.radial?.radius) {
      forces.radial = d3.forceRadial(force.radial.radius, center.x, center.y)
        .strength(force.radial.strength);

      context.guides.push({
        id: 'radial',
        type: 'circle',
        cx: center.x,
        cy: center.y,
        r: force.radial.radius
      });
    }

    return forces;
  }
}
