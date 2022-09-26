//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';
import debug from 'debug';

import { Projector } from '../scene';
import { emptyGraph, GraphData, GraphLayout, GraphLayoutLink, GraphLayoutNode, GraphNode } from './types';

const log = debug('gem:graph-force-projector');

/**
 * Return value or invoke function.
 * @param v
 * @param cb
 * @param def
 */
const valueOrFunction = <T> (v: T | ((...args: any[]) => T) | undefined, cb, def: T) => {
  return (typeof v === 'function') ? cb(v) : v ?? def;
};

/**
 * Returns the config object or an empty object if the property is set to true (or defaults to true).
 * Otherwise returns undefined.
 * @param options
 * @param cb
 * @param def
 */
const maybeCreate = <T> (options: T | boolean, cb, def = undefined) => {
  const value = (typeof options === 'boolean') ? ((options as boolean) ? {} : undefined) : options ?? def;
  if (value) {
    return cb(value);
  }
};

//
// Forces
// TODO(burdon): Provide utils for function properties (e.g., count links).
//

// https://github.com/d3/d3-force#forceLink
export type ForceLinkOptions = {
  // Default: link => 1 / Math.min(2, count(link.source), count(link.target))
  strength?: number | ((link: GraphLayoutLink<any>) => number)
  distance?: number
  iterations?: number
}

// https://github.com/d3/d3-force#forceManyBody
export type ForceManyBodyOptions = {
  strength?: number | ((node: GraphLayoutNode<any>) => number)
  distanceMax?: number
}

// https://github.com/d3/d3-force#centering
export type ForcesCenterOptions = {
  strength?: number
}

// https://github.com/d3/d3-force#forceCollide
export type ForceCollideOptions = {
  strength?: number
}

// https://github.com/d3/d3-force#forceRadial
export type ForceRadialOptions = {
  x?: number
  y?: number
  radius?: number
  strength?: number
}

// https://github.com/d3/d3-force#positioning
export type ForcePositioningOptions = {
  value?: number
  strength?: number
}

//
// Force options.
// TODO(burdon): Options for alpha, etc.
//

export type ForceOptions = {
  link?: boolean | ForceLinkOptions
  manyBody?: boolean | ForceManyBodyOptions
  center?: boolean | ForcesCenterOptions
  collide?: boolean | ForceCollideOptions
  radial?: boolean | ForceRadialOptions
  x?: ForcePositioningOptions
  y?: ForcePositioningOptions
}

export const defaultForceOptions: ForceOptions = {
  link: true,
  manyBody: true
};

export type GraphForceProjectorOptions = {
  guides?: boolean
  forces?: ForceOptions
  attributes?: {
    radius: number | ((node: GraphLayoutNode<any>, children: number) => number)
  }
}

/**
 * D3 force layout.
 */
export class GraphForceProjector<N extends GraphNode>
  extends Projector<GraphData<N>, GraphLayout<N>, GraphForceProjectorOptions> {

  // https://github.com/d3/d3-force
  _simulation = d3.forceSimulation<GraphLayoutNode<N>, GraphLayoutLink<N>>();

  // Current layout.
  _layout: GraphLayout<N> = {
    graph: {
      nodes: [],
      links: []
    },
    guides: []
  };

  numChildren = (node) => this._layout.graph.links.filter(link => link.source.id === node.id).length;

  get simulation () {
    return this._simulation;
  }

  /**
   * Merge external data with internal representation (e.g., so force properties like position are preserved).
   * @param data
   */
  mergeData (data: GraphData<N> = emptyGraph) {
    // Merge nodes.
    const nodes = data.nodes.map(node => {
      let current: GraphLayoutNode<N> = this._layout.graph.nodes.find(n => n.id === node.id);
      if (!current) {
        current = {
          id: node.id
        };
      }

      current.data = node;
      return current;
    });

    // Replace links.
    const links = data.links.map(link => ({
      id: link.id,
      source: nodes.find(n => n.id === link.source),
      target: nodes.find(n => n.id === link.target)
    }));

    this._layout = {
      graph: {
        nodes,
        links
      }
    };
  }

  onUpdate (data?: GraphData<N>) {
    log('onUpdate', JSON.stringify({ nodes: data?.nodes.length, links: data?.links.length }));
    this.mergeData(data);
    this.updateForces();

    // Guides.
    this._layout.guides = this.options.guides ? [
      {
        type: 'circle',
        cx: 0,
        cy: 0,
        r: this.context.scale.model.toValue([10, 1])
      }
    ] : undefined;

    // Initialize nodes.
    this._layout.graph.nodes.forEach(node => {
      if (!node.initialized) {
        // Get starting point from linked element.
        const link = this._layout.graph.links.find(link => link.target.id === node.id);

        // Iniital positions.
        Object.assign(node, {
          initialized: true,
          // Position around center or parent; must have delta to avoid spike.
          x: (link?.source?.x || 0) + (Math.random() - 0.5) * 30,
          y: (link?.source?.y || 0) + (Math.random() - 0.5) * 30
        });
      }

      const children = this.numChildren(node);
      Object.assign(node, {
        r: valueOrFunction<number>(this.options?.attributes?.radius, (f) => f(node, children), 6)
      });
    });

    // https://github.com/d3/d3-force#simulation_force
    const forces = this.options.forces;

    // Update simulation.
    this._simulation
      .stop()

      // Nodes
      // https://github.com/d3/d3-force#simulation_nodes
      .nodes(this._layout.graph.nodes)

      // Links.
      // https://github.com/d3/d3-force#forceLink
      .force('link', maybeCreate<ForceLinkOptions>(forces?.link, (config: ForceLinkOptions) => {
        const force = d3.forceLink()
          .id((d: GraphLayoutNode<N>) => d.id)
          .links(this._layout.graph.links);
        if (config.distance) {
          force.distance(config.distance);
        }
        if (config.strength) {
          force.strength(config.strength);
        }
        if (config.iterations) {
          force.iterations(config.iterations);
        }
        return force;
      }, {}))

      .alphaTarget(0)
      .alpha(1)
      .restart();
  }

  override async onStart () {
    this.updateForces();

    this._simulation
      .on('tick', () => {
        this.updated.emit({ layout: this._layout });
      })
      .on('end', () => { // alpha < alphaMin
        log('stopped');
      })

      // .alphaDecay(1 - Math.pow(0.001, 1 / 300))
      .alphaTarget(0)
      .alpha(1)
      .restart();
  }

  override async onStop () {
    this._simulation
      .stop();
  }

  private updateForces () {
    const forces = this.options.forces;
    log('forces', JSON.stringify(forces));

    // https://github.com/d3/d3-force#simulation_force
    this._simulation

      // Repulsion.
      // https://github.com/d3/d3-force#forceManyBody
      .force('charge', maybeCreate<ForceManyBodyOptions>(forces?.manyBody, (config: ForceManyBodyOptions) => {
        const force = d3.forceManyBody();
        if (config.distanceMax) {
          force.distanceMax(config.distanceMax);
        }
        if (config.strength) {
          force.strength(config.strength);
        }
        return force;
      }, {}))

      // Centering (average center of mass).
      // https://github.com/d3/d3-force#centering
      .force('center', maybeCreate<ForcesCenterOptions>(forces?.center, (config: ForcesCenterOptions) => {
        const force = d3.forceCenter();
        if (config.strength) {
          force.strength(config.strength);
        }
        return force;
      }))

      // Collision
      // https://github.com/d3/d3-force#forceCollide
      .force('collide', maybeCreate<ForceCollideOptions>(forces?.collide, (config: ForceCollideOptions) => {
        const force = d3.forceCollide();
        force.radius(16);
        if (config.strength) {
          force.strength(config.strength);
        }
        return force;
      }))

      // Radial
      // https://github.com/d3/d3-force#forceRadial
      .force('radial', maybeCreate<ForceRadialOptions>(forces?.radial, (config: ForceRadialOptions) => {
        const force = d3.forceRadial(config.radius ?? 0, config.x ?? 0, config.y ?? 0);
        if (config.strength) {
          force.strength(config.strength);
        }
        return force;
      }))

      // Positioning
      // https://github.com/d3/d3-force#positioning
      .force('x', maybeCreate<ForcePositioningOptions>(forces?.x, (config: ForcePositioningOptions) => {
        const force = d3.forceX(config.value ?? 0);
        if (config.strength) {
          force.strength(config.strength);
        }
        return force;
      }))
      .force('y', maybeCreate<ForcePositioningOptions>(forces?.y, (config: ForcePositioningOptions) => {
        const force = d3.forceY(config.value ?? 0);
        if (config.strength) {
          force.strength(config.strength);
        }
        return force;
      }))

      .restart();
  }
}
