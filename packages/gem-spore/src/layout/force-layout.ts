//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';

import { GridType, value } from '@dxos/gem-core';

import { Layout } from './layout';

/**
 * Creates layout from force simulation.
 *
 * https://github.com/d3/d3-force
 */
export class ForceLayout extends Layout {
  static defaults = {
    // https://github.com/d3/d3-force#simulation_alpha
    alphaDecay: 0.03,

    // https://github.com/d3/d3-force#forces
    force: {
      center: {
        strength: 0.2
      },
      radial: {
        radius: 200,
        strength: 0.3
      },
      charge: {
        strength: -300
      },
      collide: {
        strength: 0.1
      },
      links: {
        distance: 30
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

    // TODO(burdon): Calculate alpha based on diff.
    const num = this.data.nodes?.length || 0;
    const alpha = (num === 0 || Math.abs(num - data.nodes?.length) > 3) ? 1 : 0.2;

    // Update layout data.
    this._mergeData(grid, data);

    // TODO(burdon): Factor out.
    Object.assign(this.data, { guides: [] });

    // Pause simulation until nodes and forces are set.
    // https://github.com/d3/d3-force#simulation_nodes
    this._simulation
      .stop()
      .nodes(this.data.nodes);

    // Set forces.
    // https://github.com/d3/d3-force#simulation_force
    const forces = this._createForces(grid, this.data);
    Object.entries(forces).forEach(([key, value]) => this._simulation.force(key, value));

    // Restart the simulation.
    // https://github.com/d3/d3-force#simulation_restart
    // NOTE: Set alpha since data/forces have changed.
    this._simulation
      .alphaTarget(0)
      .alpha(alpha)
      .alphaDecay(alphaDecay)
      .restart();

    // https://github.com/d3/d3-force#simulation_on
    this._simulation.on('tick', () => {
      this.emitUpdate();
    });
  }

  /**
   * The layout maintains a set of nodes controlled by the simulation.
   * The data graph is used to update this set but is not modified.
   * Each simulation node has the following properties: { index, x, y, vx, vy, fx, fy }.
   *
   * @param grid
   * @param data - User data (not force updated data).
   */
  _mergeData (grid, data) {
    const { force } = this._options;
    const center = value(this._options.center)(grid);
    const { nodes = [], links = [] } = data;

    // Merge nodes.
    const current = this._simulation.nodes();
    const mergedNodes = nodes.map(node => {
      const existing = current.find(n => (n as any).id === node.id);
      if (existing) {
        // Preserve current force properties.
        // https://github.com/d3/d3-force#simulation_nodes
        const { x, y, vx, vy, fx = null, fy = null } = existing;

        // TODO(burdon): Assign data property instead of ALL of the node's properties.
        return Object.assign(existing, node, { x, y, vx, vy, fx, fy });
      }

      // Create new node with initial properties.
      return Object.assign({}, node, {
        // Random initial position (otherwise repulsion is unstable).
        x: center.x + (Math.random() - 0.5) * (force?.radial.radius || grid.width / 4),
        y: center.y + (Math.random() - 0.5) * (force?.radial.radius || grid.height / 4),
        vx: 0,
        vy: 0,
        fx: null,
        fy: null
        // TODO(burdon): Unify with property adapter.
      }, this._options.initializer && this._options.initializer(node, center));
    });

    this._setData({
      nodes: mergedNodes,
      links
    });
  }

  _createForces (grid: GridType, data) {
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
        .distance(force.links.distance);

      if (force.links.strength) {
        force.links.strenth(force.links.strength);
      }
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
