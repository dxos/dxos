//
// Copyright 2018 DxOS
//

import * as d3 from 'd3';
import defaultsDeep from 'lodash.defaultsdeep';

/**
 * D3 Physics model.
 */
export class Physics {

  // TODO(burdon): Create builder.
  // https://github.com/d3/d3-3.x-api-reference/blob/master/Force-Layout.md
  static DEFAULTS = {
    alpha: 0.8,
    alphaDecay: 0.05,

    link: {
      distance: 50,
      strength: .9
    },

    charge: {
      distanceMax: 200,
      strength: -50
    },

    collide: {
      radius: 40,
      strength: 0.9
    },

    center: {
      x: 0,
      y: 0
    }
  };

  constructor(config) {
    this._config = defaultsDeep({}, config, Physics.DEFAULTS);
  }

  get config() {
    return this._config;
  }

  apply(simulation, nodes, links) {
    // console.log(JSON.stringify(this.config, 0, 2));

    // https://github.com/d3/d3-force#forceManyBody
    if (this.config.charge) {
      let { distanceMax, strength } = this.config.charge;
      simulation.force('charge', d3.forceManyBody().distanceMax(distanceMax).strength(strength));
    }

    // https://github.com/d3/d3-force#forceCollide
    if (this.config.collide) {
      const { radius, strength } = this.config.collide;
      simulation.force('collide', d3.forceCollide().radius(radius).strength(strength));
    }

    // https://github.com/d3/d3-force#forceCenter
    if (this.config.center) {
      let { x, y } = this.config.center;
      simulation.force('center', d3.forceCenter(x, y));
    }

    // https://github.com/d3/d3-force#links
    if (links && this.config.link) {
      const { distance, strength } = this.config.link;
      simulation.force('link', d3.forceLink(links).id(d => d.id).distance(distance).strength(strength));
    }

    // https://github.com/d3/d3-force#nodes
    if (nodes) {
      simulation.nodes(nodes);
    }

    simulation

      // https://github.com/d3/d3-force#simulation_alpha
      .alpha(this.config.alpha)
      .alphaDecay(this.config.alphaDecay)

      // https://github.com/d3/d3-force#simulation_restart
      .restart();
  }
}
