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

import { Projector, type ProjectorOptions } from './projector';
import { emptyGraph, type GraphLayout, type GraphLayoutEdge, type GraphLayoutNode } from './types';

/**
 * Return value or invoke function.
 * @param v
 * @param cb
 * @param defaultValue
 */
const getValue = <T>(v: T | ((...args: any[]) => T) | undefined, cb, defaultValue: T) => {
  return typeof v === 'function' ? cb(v) : v ?? defaultValue;
};

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
  const value = typeof options === 'boolean' ? (options ? {} : undefined) : options ?? defaultValue;
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
  value?: number;
  strength?: number;
};

/**
 * All force options.
 * NOTE: A value of `true` enables the force with the default option.
 */
// TODO(burdon): Options for alpha, etc.
export type ForceOptions = {
  link?: boolean | ForceLinkOptions;
  manyBody?: boolean | ForceManyBodyOptions;
  center?: boolean | ForceCenterOptions;
  collide?: boolean | ForceCollideOptions;
  radial?: boolean | ForceRadialOptions;
  x?: ForcePositioningOptions;
  y?: ForcePositioningOptions;
};

export const defaultForceOptions: ForceOptions = {
  link: true,
  manyBody: true,
};

export type GraphForceProjectorOptions = ProjectorOptions &
  Partial<{
    guides?: boolean;
    forces?: ForceOptions;
    radius?: number;
    attributes?: {
      radius: number | ((node: GraphLayoutNode<any>, children: number) => number);
    };
  }>;

/**
 * D3 force layout.
 */
export class GraphForceProjector extends Projector<Graph, GraphLayout, GraphForceProjectorOptions> {
  // https://github.com/d3/d3-force
  _simulation = forceSimulation<GraphLayoutNode, GraphLayoutEdge>();

  // Current layout.
  _layout: GraphLayout = {
    graph: {
      nodes: [],
      edges: [],
    },
  };

  get layout() {
    return this._layout;
  }

  get simulation() {
    return this._simulation;
  }

  numChildren(node: GraphLayoutNode): number {
    return this._layout.graph.edges.filter((edge) => edge.source.id === this.options.idAccessor(node)).length;
  }

  override onUpdate(data?: Graph): void {
    this.mergeData(data);
    this._simulation.stop();
    this.updateForces(this.options.forces);

    // Guides.
    this._layout.guides = this.options.guides
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
    this._layout.graph.nodes.forEach((node) => {
      if (!node.initialized) {
        // Get starting point from edgeed element.
        const edge = this._layout.graph.edges.find((edge) => edge.target.id === this.options.idAccessor(node));

        // Initial positions.
        Object.assign(node, {
          initialized: true,
          // Position around center or parent; must have delta to avoid spike.
          x: edge?.source?.x + (Math.random() - 0.5) * (this.options.radius ?? 100),
          y: edge?.source?.y + (Math.random() - 0.5) * (this.options.radius ?? 100),
        });
      }

      const children = this.numChildren(node);
      Object.assign(node, {
        r: getValue<number>(this.options?.attributes?.radius, (f) => f(node, children), 6),
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

      // Edges.
      // https://github.com/d3/d3-force#forceLink
      .force(
        'link',
        maybeForce<ForceLinkOptions>(
          forces?.link,
          (config: ForceLinkOptions) => {
            const force = forceLink()
              .id((d: GraphLayoutNode) => d.id)
              .links(this._layout.graph.edges);

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

      .alphaTarget(0)
      .alpha(1)
      .restart();
  }

  /**
   * Merge external data with internal representation (e.g., so force properties like position are preserved).
   * @param data
   */
  private mergeData(data: Graph = emptyGraph): GraphLayout {
    // Merge nodes.
    const nodes: GraphLayoutNode[] = data.nodes.map((node) => {
      let existing: GraphLayoutNode = this._layout.graph.nodes.find((n) => n.id === this.options.idAccessor(node));
      if (!existing) {
        existing = {
          id: this.options.idAccessor(node),
        };
      }

      existing.data = node;
      return existing;
    });

    // Replace edges.
    const edges = data.edges
      .map((edge) => ({
        id: edge.id,
        source: nodes.find((n) => n.id === edge.source),
        target: nodes.find((n) => n.id === edge.target),
      }))
      .filter((edge) => edge.source && edge.target);

    this._layout = {
      graph: {
        nodes,
        edges,
      },
    };

    return this._layout;
  }

  override async onStart(): Promise<void> {
    // TODO(burdon): Generalize.
    // Delay radial force until other forces have settled.
    const { radial, ...forces } = this.options.forces ?? {};
    if (typeof radial === 'boolean' || !radial?.delay) {
      this.updateForces(this.options.forces);
    } else {
      this.updateForces(forces);
      setTimeout(() => {
        this._simulation.alphaTarget(0).alpha(1).restart();
        this.updateForces(this.options.forces);
      }, radial.delay);
    }

    this._simulation
      .on('tick', () => {
        this.updated.emit({ layout: this._layout });
      })
      .on('end', () => {
        // alpha < alphaMin
      })

      // .alphaDecay(1 - Math.pow(0.001, 1 / 300))
      .alphaTarget(0)
      .alpha(1)
      .restart();
  }

  override async onStop(): Promise<void> {
    this._simulation.stop();
  }

  /**
   * Update all forces.
   */
  private updateForces(forces: ForceOptions): void {
    // https://github.com/d3/d3-force#simulation_force
    this._simulation

      // Repulsion.
      // https://github.com/d3/d3-force#forceManyBody
      .force(
        'manyBody',
        maybeForce<ForceManyBodyOptions>(
          forces?.manyBody,
          (config: ForceManyBodyOptions) => {
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

      // Centering (average center of mass).
      // https://github.com/d3/d3-force#centering
      .force(
        'center',
        maybeForce<ForceCenterOptions>(forces?.center, (config: ForceCenterOptions) => {
          const force = forceCenter();
          if (config.strength != null) {
            force.strength(config.strength);
          }
          return force;
        }),
      )

      // Collision
      // https://github.com/d3/d3-force#forceCollide
      .force(
        'collide',
        maybeForce<ForceCollideOptions>(forces?.collide, (config: ForceCollideOptions) => {
          const force = forceCollide();
          force.radius(config.radius ?? 8);
          if (config.strength != null) {
            force.strength(config.strength);
          }
          return force;
        }),
      )

      // Radial
      // https://github.com/d3/d3-force#forceRadial
      .force(
        'radial',
        maybeForce<ForceRadialOptions>(forces?.radial, (config: ForceRadialOptions) => {
          const force = forceRadial(config.radius ?? 0, config.x ?? 0, config.y ?? 0);
          if (config.strength != null) {
            force.strength(config.strength);
          }
          return force;
        }),
      )

      // Positioning
      // https://github.com/d3/d3-force#positioning
      .force(
        'x',
        maybeForce<ForcePositioningOptions>(forces?.x, (config: ForcePositioningOptions) => {
          const force = forceX(config.value ?? 0);
          if (config.strength != null) {
            force.strength(config.strength);
          }
          return force;
        }),
      )
      .force(
        'y',
        maybeForce<ForcePositioningOptions>(forces?.y, (config: ForcePositioningOptions) => {
          const force = forceY(config.value ?? 0);
          if (config.strength != null) {
            force.strength(config.strength);
          }
          return force;
        }),
      )

      .restart();
  }
}
