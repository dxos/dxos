//
// Copyright 2020 DxOS, Inc.
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

  // TODO(burdon): Based on grid or size?
  get defaults() {
    return {
      force: {
        charge: {
          strength: -30
        },

        radial: {
          radius: 200,
          strength: .1
        },

        links: {
          // https://github.com/d3/d3-force#link_strength
          strength: (link /*, i, links*/) => {
            // TODO(burdon): Count links.
            const count = () => 1;

            return 1 / Math.min(count(link.source), count(link.target));
          },
          distance: 30
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

  _onUpdate(grid, data) {
    const { force } = this._options;
    const { nodes = [], links = [] } = data;

    const center = value(this._options.center)(grid);

    // Set initial position.
    nodes.forEach(node => {
      if (!node.x || !node.y) {
        Object.assign(node, {
          x: center.x + (Math.random() - 0.5) * force.radial.radius,
          y: center.y + (Math.random() - 0.5) * force.radial.radius,
          vx: null,
          vy: null
        });
      }
    });

    // TODO(burdon): Context data structure.
    data.guides = [
      {
        id: 'gravity',
        type: 'circle',
        cx: center.x,
        cy: center.y,
        r: force.radial.radius
      }
    ];

    // TODO(burdon): Configure forces separately by config.
    this._simulation

      /**
       * https://github.com/d3/d3-force#simulation_nodes
       * Updates each datum with { index, x, y, vx, vy, fx, fy }
       * NOTE: call before setting links.
       */
      .nodes(nodes)

      /**
       * https://github.com/d3/d3-force#simulation_on
       */
      .on('tick', () => {
        this.emitUpdate(data);
      })

      /**
       * https://github.com/d3/d3-force#forceCenter
       */
      .force('center', d3.forceCenter(center.x, center.y))

      /**
       * https://github.com/d3/d3-force#forceCollide
       */
      .force('collide', d3.forceCollide())

      /**
       * https://github.com/d3/d3-force#forceManyBody
       */
      .force('charge', d3.forceManyBody()
        .strength(force.charge.strength)
      )

      /**
       * https://github.com/d3/d3-force#forceRadial
       */
      .force('gravity', d3.forceRadial(force.radial.radius, center.x, center.y)
        .strength(force.radial.strength)
      )

      /**
       * https://github.com/d3/d3-force#link_links
       */
      .force('links', d3.forceLink(links)
        .id(d => d.id)
        // .strength(force.links.strength)
        // .distance(force.links.distance)
      );

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
