//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';
import debug from 'debug';

import { Projector } from '../scene';
import { GraphLayout } from './graph-renderer';
import { emptyGraph, GraphData, GraphLink, GraphNode } from './types';

const log = debug('gem:graph-force-projector');

const value = <T> (v: T | boolean): T => typeof v === 'boolean' ? undefined : v;

/**
 * Returns the config object or an empty object if the property is set to true (or defaults to true).
 * Otherwise returns undefined.
 * @param config
 * @param f
 * @param def
 */
const maybe = <T> (config: T | boolean, f, def = false) => {
  if (config || (config === undefined && def)) {
    return f(value<T>(config) ?? {});
  }
};

export type ManyBodyOptions = {
  strength?: (count: number) => number
  distanceMax?: number
}

export type LinkOptions = {
  strength?: (link: GraphLink<any>) => number
  distance?: number
}

export type CenterOptions = {
  strength?: number
}

export type CollideOptions = {
  strength?: number
}

export type RadialOptions = {
  x?: number
  y?: number
  radius?: number
  strength?: number
}

export type PositioningOptions = {
  value?: number
  strength?: number
}

export type ForceOptions = {
  manyBody?: boolean | ManyBodyOptions
  link?: boolean | LinkOptions
  center?: boolean | CenterOptions
  collide?: boolean | CollideOptions
  radial?: RadialOptions
  x?: PositioningOptions
  y?: PositioningOptions
}

export type GraphForceProjectorOptions = {
  guides?: boolean
  forces?: ForceOptions
}

// TODO(burdon): Define defaults and use below where using ?? not set.
export const defaultForceOptions: ForceOptions = {};

/**
 * D3 force layout.
 */
export class GraphForceProjector<T> extends Projector<GraphData<T>, GraphLayout<T>, GraphForceProjectorOptions> {
  // https://github.com/d3/d3-force
  _simulation = d3.forceSimulation<GraphNode<T>, GraphLink<T>>();

  // Current layout.
  _layout: GraphLayout<T> = {
    graph: {
      nodes: [],
      links: []
    }
  };

  numChildren = (node) => this._layout.graph.links
    .filter(link => link.source === node.id).length;

  get simulation () {
    return this._simulation;
  }

  /**
   * Merge external data with internal representation (e.g., so force properties like position are preserved).
   * @param data
   */
  // TODO(burdon): Differentiate external and internal (layout) data structure.
  mergeData (data: GraphData<T> = emptyGraph) {
    // Merge nodes.
    const nodes = data.nodes.map(node => {
      const existing = this._layout.graph.nodes.find(n => n.id === node.id);
      if (existing) {
        existing.data = node.data;
        return existing;
      }

      return node;
    });

    // Replace links.
    const links = data.links.map(link => ({
      id: link.id,
      source: nodes.find(n => n.id === link.source.id),
      target: nodes.find(n => n.id === link.target.id)
    }));

    this._layout = {
      graph: {
        nodes,
        links
      }
    };
  }

  onUpdate (data: GraphData<T>) {
    log('onUpdate', JSON.stringify({ nodes: data.nodes.length, links: data.links.length }));
    this.mergeData(data);

    // Guides.
    this._layout.guides = this.options.guides ? {
      circles: [
        {
          cx: 0,
          cy: 0,
          r: this.context.scale.model.toValue([10, 1])
        }
      ]
    } : undefined;

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
        children,
        r: 5 + children * 2 // TODO(burdon): Options.
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
      .force('link', maybe<LinkOptions>(forces?.link, (config: LinkOptions) => {
        const force = d3.forceLink(this._layout.graph.links)
          .distance(config.distance ?? 20);

        // Default: link => 1 / Math.min(2, count(link.source), count(link.target))
        if (config.strength) {
          force.strength(config.strength);
        }

        return force;
      }, true))

      .alphaMin(0.001) // Default 0.001
      .alpha(0.7) // Default 0.7
      .restart();
  }

  async onStart () {
    this.updateForces();

    this._simulation
      .on('tick', () => {
        this.updated.emit({ layout: this._layout });
      })
      .on('end', () => { // alpha < alphaMin
        log('stopped');
      })
      .alpha(0.7) // Default 0.4
      .restart();
  }

  async onStop () {
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
      .force('charge', maybe<ManyBodyOptions>(forces?.manyBody, (config: ManyBodyOptions) => {
        const strength = config.strength ?? (count => (-280 - (Math.log(count + 1) * 10)));
        return d3.forceManyBody()
          .distanceMax(config.distanceMax ?? 200)
          .strength((d: GraphNode<any>) => {
            return strength(this.numChildren(d));
          });
        },
        true
      ))

      // Centering (average center of mass).
      // https://github.com/d3/d3-force#centering
      .force('center', maybe<CenterOptions>(forces?.center, (config: CenterOptions) => {
        return d3.forceCenter()
          .strength(config.strength ?? 0.2);
      }))

      // Collision
      // https://github.com/d3/d3-force#forceCollide
      .force('collide', maybe<CollideOptions>(forces?.collide, (config: CollideOptions) => {
        return d3.forceCollide()
          .strength(config.strength ?? 0.5);
      }))

      // Radial
      // https://github.com/d3/d3-force#forceRadial
      .force('radial', maybe<RadialOptions>(forces?.radial, (config: RadialOptions) => {
        return d3.forceRadial(config.radius ?? 200, config.x ?? 0, config.y ?? 0)
          .strength(config.strength ?? 0.1);
      }))

      // Positioning
      // https://github.com/d3/d3-force#positioning
      .force('x', maybe<PositioningOptions>(forces?.x, (config: PositioningOptions) => {
        return d3.forceX(config.value ?? 0)
          .strength(config.strength ?? 0.05);
      }))
      .force('y', maybe<PositioningOptions>(forces?.y, (config: PositioningOptions) => {
        return d3.forceY(config.value ?? 0)
          .strength(config.strength ?? 0.05);
      }))

      .restart();
  }
}
