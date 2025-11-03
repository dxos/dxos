//
// Copyright 2021 DXOS.org
//

import {
  type Force,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  forceX,
  forceY,
} from 'd3';

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type GraphLayoutEdge, type GraphLayoutNode } from '../types';

import { forcePoint } from './graph-forces';
import { GraphProjector, type GraphProjectorOptions } from './graph-projector';

/**
 * Return value or invoke function.
 * @param valueOrFunction
 * @param invoker
 * @param defaultValue
 */
const getValue = <T>(
  valueOrFunction: T | ((...args: any[]) => T) | undefined,
  invoker: (fn: (...args: any[]) => T) => T,
  defaultValue: T,
) =>
  (typeof valueOrFunction === 'function' ? invoker(valueOrFunction as (...args: any[]) => T) : valueOrFunction) ??
  defaultValue;

/**
 * Returns the config object or an empty object if the property is set to true (or defaults to true).
 * Otherwise returns undefined.
 * @param options
 * @param cb
 * @param defaultValue
 */
const maybeForce = <Config>(
  options: Config | boolean,
  cb: (config: Config) => Force<any, any>,
  defaultValue = undefined,
) => {
  const value = typeof options === 'boolean' ? (options ? {} : undefined) : (options ?? defaultValue);
  if (value) {
    return cb(value);
  }
};

//
// Forces
// TODO(burdon): Provide utils for function properties (e.g., count edges).
//

/**
 * https://github.com/d3/d3-force#forceLink
 */
export type ForceLinkOptions = {
  // Default: edge => 1 / Math.min(2, count(edge.source), count(edge.target))
  strength?: number | ((edge: GraphLayoutEdge<any>) => number);
  distance?: number;
  iterations?: number;
};

/**
 * https://github.com/d3/d3-force#forceManyBody
 */
export type ForceManyBodyOptions = {
  strength?: number | ((node: GraphLayoutNode<any>) => number);
  distanceMax?: number;
};

/**
 * https://github.com/d3/d3-force#centering
 */
export type ForceCenterOptions = {
  x?: number;
  y?: number;
  strength?: number;
};

/**
 * https://github.com/d3/d3-force#forceCollide
 */
export type ForceCollideOptions = {
  radius?: number;
  strength?: number;
};

/**
 * https://github.com/d3/d3-force#forceRadial
 */
export type ForceRadialOptions = {
  delay?: number;
  x?: number;
  y?: number;
  radius?: number;
  strength?: number;
};

/**
 * https://github.com/d3/d3-force#positioning
 */
export type ForcePositioningOptions = {
  x?: number;
  y?: number;
  strength?: number;
};

/**
 * All force options.
 * NOTE: A value of `true` enables the force with the default option.
 */
// TODO(burdon): Options for alpha, etc.
// TODO(burdon): Change to map of forces by type (i.e., support multiple forces of the same type).
export type ForceOptions = {
  link?: boolean | ForceLinkOptions;
  manyBody?: boolean | ForceManyBodyOptions;
  center?: boolean | ForceCenterOptions;
  collide?: boolean | ForceCollideOptions;
  radial?: boolean | ForceRadialOptions;
  point?: boolean | ForcePositioningOptions;
  x?: boolean | ForcePositioningOptions;
  y?: boolean | ForcePositioningOptions;
};

export const defaultForceOptions: ForceOptions = {
  link: true,
  manyBody: true,
  // center: true,
  point: true,
};

export type GraphForceProjectorOptions = GraphProjectorOptions & {
  guides?: boolean;
  forces?: ForceOptions;
  radius?: number;
  attributes?: {
    radius?: number | ((node: GraphLayoutNode<any>, children: number) => number);
    linkForce?: boolean | ((edge: GraphLayoutEdge<any>) => boolean);
  };
};

/**
 * D3 force directed graph layout using d3 simulation..
 */
export class GraphForceProjector<NodeData = any> extends GraphProjector<NodeData, GraphForceProjectorOptions> {
  // https://github.com/d3/d3-force
  private _simulation = forceSimulation<GraphLayoutNode, GraphLayoutEdge>();

  private _timeout?: NodeJS.Timeout;

  get forces() {
    return this.options.forces ?? defaultForceOptions;
  }

  get simulation() {
    return this._simulation;
  }

  restart() {
    this._simulation.alpha(1).restart();
  }

  override findNode(x: number, y: number, radius: number): GraphLayoutNode<NodeData> | undefined {
    return this._simulation.find(x, y, radius);
  }

  override async onStart() {
    clearTimeout(this._timeout);
    let propagating = true;

    // Delay radial force until other forces have settled.
    const { radial, ...forces } = this.forces;
    const delay = typeof radial === 'object' ? radial.delay : undefined;
    if (delay) {
      propagating = false;
      this.updateForces(forces);
      this._timeout = setTimeout(() => {
        this.updateForces(this.forces);
        this.restart();
        this._timeout = setTimeout(() => {
          propagating = true;
        }, delay);
      }, delay);
    } else {
      this.updateForces(this.forces);
    }

    this._simulation
      .on('tick', () => propagating && this.emitUpdate())
      .velocityDecay(0.3)
      .alphaDecay(1 - Math.pow(0.001, 1 / 300))
      .alpha(1)
      .restart();
  }

  override async onStop() {
    clearTimeout(this._timeout);
    this._simulation.stop();
  }

  override onRefresh(dragging = false) {
    // Disable centering force while dragging.
    if (this.forces.center) {
      if (dragging) {
        this._simulation.force('center', null);
      } else {
        this.updateForces(this.forces);
      }
    }

    this.restart();
  }

  override onUpdate(graph?: Graph): void {
    log('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    this._simulation.stop();
    this.mergeData(graph);
    this.updateLayout();
    this.updateForces(this.forces);
    this.restart();
  }

  private updateLayout() {
    // Guides.
    this.layout.guides = this.options.guides
      ? [
          {
            id: 'g-1',
            type: 'circle',
            cx: 0,
            cy: 0,
            r: this.context.scale.model.toValue([10, 1]),
          },
        ]
      : undefined;

    // Initialize nodes.
    this.layout.graph.nodes.forEach((node) => {
      if (!node.initialized) {
        // Get starting point from linked element.
        // const edge = this.layout.graph.edges.find((edge) => edge.target.id === this.options.idAccessor(node));
        const a = 2 * Math.PI * Math.random();
        const r = this.options.radius ?? 200;

        // Initial positions.
        Object.assign(node, {
          initialized: true,

          // TODO(burdon): Only when new nodes added to initial layout.
          // Position around center or parent; must have delta to avoid spike.
          // x: edge?.source?.x ?? Math.cos(a) * r,
          // y: edge?.source?.y ?? Math.sin(a) * r,
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
        });
      }

      // TODO(burdon): Ignored by renderer?
      Object.assign(node, {
        r: getValue<number>(this.options?.attributes?.radius, (fn) => fn(node, this.numChildren(node)), 6),
      });
    });

    // Initialize edges.
    this.layout.graph.edges.forEach((edge) => {
      Object.assign(edge, {
        linkForce: getValue<boolean>(this.options.attributes?.linkForce, (fn) => fn(edge), true),
      });
    });
  }

  /**
   * Update all forces.
   */
  private updateForces(forces: ForceOptions): void {
    log('updateForces', { forces });

    // https://github.com/d3/d3-force#simulation_force
    this._simulation

      // Nodes
      // https://github.com/d3/d3-force#simulation_nodes
      .nodes(this.layout.graph.nodes)

      // Links.
      // https://github.com/d3/d3-force#forceLink
      .force(
        'link',
        maybeForce<ForceLinkOptions>(
          forces?.link,
          (config) => {
            const force = forceLink()
              .id((d: GraphLayoutNode) => d.id)
              .links(this.layout.graph.edges.filter((edge) => edge.linkForce));
            if (config.distance != null) {
              force.distance(config.distance);
            }
            if (config.strength != null) {
              force.strength(config.strength);
            }
            if (config.iterations != null) {
              force.iterations(config.iterations);
            }
            return force;
          },
          forces?.link === false ? undefined : {},
        ),
      )

      // Repulsion.
      // https://github.com/d3/d3-force#forceManyBody
      .force(
        'manyBody',
        maybeForce<ForceManyBodyOptions>(
          forces?.manyBody,
          (config) => {
            const force = forceManyBody();
            if (config.distanceMax != null) {
              force.distanceMax(config.distanceMax);
            }
            if (config.strength != null) {
              force.strength(config.strength);
            }
            return force;
          },
          forces?.manyBody === false ? undefined : {},
        ),
      )

      // Collision.
      // https://github.com/d3/d3-force#forceCollide
      .force(
        'collide',
        maybeForce<ForceCollideOptions>(forces?.collide, (config) => {
          const force = forceCollide();
          force.radius(config.radius ?? 8);
          if (config.strength != null) {
            force.strength(config.strength);
          }
          return force;
        }),
      )

      // Radial.
      // https://github.com/d3/d3-force#forceRadial
      .force(
        'radial',
        maybeForce<ForceRadialOptions>(forces?.radial, (config) => {
          const force = forceRadial(config.radius ?? 100, config.x ?? 0, config.y ?? 0);
          if (config.strength != null) {
            force.strength(config.strength);
          }
          return force;
        }),
      )

      // Centering.
      // NOTE: This moves all nodes such that the center of mass is at the origin.
      // It is different from the positional force which attracts nodes to a point.
      // https://github.com/d3/d3-force#centering
      .force(
        'center',
        maybeForce<ForceCenterOptions>(forces?.center, (config) => {
          const force = forceCenter()
            .x(config.x ?? 0)
            .y(config.y ?? 0);
          if (config.strength != null) {
            force.strength(config.strength);
          }
          return force;
        }),
      )

      // Positioning.
      // https://github.com/d3/d3-force#forcePoint
      .force(
        'point',
        maybeForce<ForcePositioningOptions>(forces?.point, ({ x = 0, y = 0, strength }) =>
          forcePoint({ x, y, strength }),
        ),
      )
      .force(
        'x',
        maybeForce<ForcePositioningOptions>(forces?.x, (config: ForcePositioningOptions) => {
          const force = forceX(config.x ?? 0);
          if (config.strength != null) {
            force.strength(config.strength);
          }
          return force;
        }),
      )
      .force(
        'y',
        maybeForce<ForcePositioningOptions>(forces?.y, (config: ForcePositioningOptions) => {
          const force = forceY(config.y ?? 0);
          if (config.strength != null) {
            force.strength(config.strength);
          }
          return force;
        }),
      );
  }
}
