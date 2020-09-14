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

  static defaults = {
    // https://github.com/d3/d3-force#simulation_alpha
    alphaDecay: 0.05,

    // https://github.com/d3/d3-force#forces
    force: {
      center: {
        strength: 0.3
      },
      radial: {
        radius: 200,
        strength: 0.05
      },
      charge: {
        strength: -300
      },
      collide: {
        strength: 0.1
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
  }

  // https://github.com/d3/d3-force
  _simulation = d3.forceSimulation();

  get defaults () {
    return ForceLayout.defaults;
  }

  get simulation () {
    return this._simulation;
  }

  _onReset () {
    // TODO(burdon): Reset forces.
    this._simulation
      .on('tick', null)
      .nodes([])
      .stop();
  }

  _onUpdate (grid, data) {
    const { alphaDecay } = this._options;

    // Reset.
    this.data.guides = [];

    // Update node layout.
    this.data.nodes = this._mergeData(grid, data);
    this.data.links = data.links;

    // Pause simulation until nodes and forces are set.
    // https://github.com/d3/d3-force#simulation_nodes
    this._simulation
      .stop()
      .nodes(data.nodes);

    // Set forces.
    // https://github.com/d3/d3-force#simulation_force
    const forces = this._createForces(grid, data);
    Object.values(forces).forEach((value, key) => this._simulation.force(key, value));

    // Restart the simulation.
    // https://github.com/d3/d3-force#simulation_restart
    // NOTE: Set alpha since data/forces have changed.
    this._simulation
      .alphaTarget(0)
      .alpha(1)
      .alphaDecay(alphaDecay)
      .restart();

    // https://github.com/d3/d3-force#simulation_on
    this._simulation.on('tick', () => {
      this.emitUpdate(data); // TODO(burdon): this.data?
    });
  }

  /**
   * The layout maintains a set of nodes controlled by the simulation.
   * The data graph is used to update this set but is not modified.
   * Each simulation node has the following properties: { index, x, y, vx, vy, fx, fy }.
   */
  _mergeData (grid, data) {
    const { force } = this._options;
    const center = value(this._options.center)(grid);
    const { nodes = [] } = data;

    // Merge nodes.
    // TODO(burdon): Set the data.node as a property of the force node for liveness.
    const current = this._simulation.nodes();
    return nodes.map(node => {
      const match = current.find(n => n.id === node.id);
      if (match) {
        // Preserve current force properties.
        // https://github.com/d3/d3-force#simulation_nodes
        const { x, y, vx, vy, fx = null, fy = null } = match;
        // return Object.assign(match, node, { x, y, vx, vy, fx, fy });
        return Object.assign(node, { x, y, vx, vy, fx, fy });
      }

      // TODO(burdon): This isn't working in the echo demo.
      // Create new node with properties.
      Object.assign(node, {
      // Object.assign({}, node, {
        // Random initial position (otherwise explodes).
        x: center.x + (Math.random() - .5) * (force?.radial.radius || grid.width / 2),
        y: center.y + (Math.random() - .5) * (force?.radial.radius || grid.height / 2),
        vx: 0,
        vy: 0,
        fx: null,
        fy: null
      }, this._options.initializer && this._options.initializer(node, center));

      return node;
    });
  }

  _createForces (grid, data) {
    const { force } = this._options;
    const center = value(this._options.center)(grid);

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
      const { links = [] } = data;
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
      // TODO(burdon): Bug. If strength is set after changing the center then center isn't updated?
      forces.center = d3.forceCenter(center.x, center.y)
        .strength(force.center.strength);
    }

    /**
     * https://github.com/d3/d3-force#forceRadial
     * NOTE: Opposes center.
     */
    if (force.radial?.radius) {
      forces.radial = d3.forceRadial(force.radial.radius, center.x, center.y)
        .strength(force.radial.strength);

      this.data.guides.push({
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
