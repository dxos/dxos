//
// Copyright 2026 DXOS.org
//

import { type Simulation, forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3';

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type LayoutEdge, type LayoutGraph, type LayoutNode } from '../types';
import { Projector } from './projector';

const DEFAULT_RADIUS = 200;

export type ForceProjectorOptions = {
  radius?: number;
  linkDistance?: number;
  manyBodyStrength?: number;
  collideRadius?: number;
};

/**
 * D3 force-directed projector. Owns its own simulation; tick() integrates one step.
 */
export class ForceProjector<NodeData = any, EdgeData = any> extends Projector<NodeData, EdgeData> {
  #layout: LayoutGraph<NodeData, EdgeData> = { nodes: [], edges: [] };
  readonly #simulation: Simulation<LayoutNode<NodeData>, LayoutEdge<NodeData, EdgeData>>;
  readonly #options: ForceProjectorOptions;

  constructor(options: ForceProjectorOptions = {}) {
    super();
    this.#options = options;
    this.#simulation = forceSimulation<LayoutNode<NodeData>, LayoutEdge<NodeData, EdgeData>>()
      .stop()
      .alphaDecay(0)
      .velocityDecay(0.3);
  }

  get layout() {
    return this.#layout;
  }

  override findNode(x: number, y: number, radius: number): LayoutNode<NodeData> | undefined {
    return this.#simulation.find(x, y, radius);
  }

  protected override onUpdate(graph: Graph.Any): void {
    log('force.update', { nodes: graph.nodes.length, edges: graph.edges.length });

    const radius = this.#options.radius ?? DEFAULT_RADIUS;
    const existing = new Map(this.#layout.nodes.map((n) => [n.id, n]));

    const nodes: LayoutNode<NodeData>[] = graph.nodes.map((n) => {
      const prev = existing.get(n.id);
      if (prev) {
        prev.data = n.data as NodeData | undefined;
        prev.type = n.type;
        return prev;
      }
      const angle = 2 * Math.PI * Math.random();
      return {
        id: n.id,
        type: n.type,
        data: n.data as NodeData | undefined,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        r: 8,
        initialized: true,
      };
    });

    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const edges: LayoutEdge<NodeData, EdgeData>[] = [];
    for (const e of graph.edges) {
      const source = nodeById.get(e.source);
      const target = nodeById.get(e.target);
      if (!source || !target) {
        continue;
      }
      edges.push({ id: e.id, type: e.type, data: e.data as EdgeData | undefined, source, target });
    }

    this.#layout = { nodes, edges };

    this.#simulation
      .nodes(nodes)
      .force(
        'link',
        forceLink<LayoutNode<NodeData>, LayoutEdge<NodeData, EdgeData>>(edges)
          .id((n) => n.id)
          .distance(this.#options.linkDistance ?? 40),
      )
      .force('manyBody', forceManyBody().strength(this.#options.manyBodyStrength ?? -80))
      .force('collide', forceCollide(this.#options.collideRadius ?? 12))
      .force('center', forceCenter(0, 0))
      .alpha(1);
  }

  protected override onTick(_dt: number): boolean {
    this.#simulation.tick(1);
    return this.#simulation.alpha() > this.#simulation.alphaMin();
  }
}
