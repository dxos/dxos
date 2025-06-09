//
// Copyright 2025 DXOS.org
//

import { type Graph } from '@dxos/graph';

import { Projector, type ProjectorOptions } from './projector';
import { emptyGraph, type GraphLayout, type GraphLayoutNode } from './types';
import { type SVGContext } from '../hooks';

export type GraphProjectorOptions = ProjectorOptions & {};

/**
 * Base class for graph projectors.
 */
export abstract class GraphProjector<NodeData = any, Options extends GraphProjectorOptions = any> extends Projector<
  Graph,
  GraphLayout<NodeData>,
  Options
> {
  protected readonly _layout: GraphLayout<NodeData>;

  constructor(context: SVGContext, options?: Options, layout?: GraphLayout<NodeData>) {
    super(context, options);
    this._layout = {
      id: Math.random().toString().slice(2, 10),
      graph: {
        nodes: [...(layout?.graph.nodes ?? [])],
        edges: [...(layout?.graph.edges ?? [])],
      },
    };
  }

  get layout() {
    return this._layout;
  }

  reset() {
    this._layout.graph.nodes = [];
    this._layout.graph.edges = [];
    this.emitUpdate();
  }

  numChildren(node: GraphLayoutNode) {
    return this._layout.graph.edges.filter((edge) => edge.source.id === this.options.idAccessor(node)).length;
  }

  /**
   * Merge external data with internal representation (e.g., so force properties like position are preserved).
   * @param data
   */
  protected mergeData(data: Graph = emptyGraph) {
    // Merge nodes.
    const nodes: GraphLayoutNode[] = data.nodes.map((node) => {
      let current: GraphLayoutNode = this._layout.graph.nodes.find((n) => n.id === this.options.idAccessor(node));
      if (!current) {
        current = {
          id: this.options.idAccessor(node),
        };
      }

      current.data = node;
      return current;
    });

    // Replace edges.
    const edges = data.edges
      .map((edge) => ({
        id: edge.id,
        source: nodes.find((n) => n.id === edge.source),
        target: nodes.find((n) => n.id === edge.target),
        data: edge.data,
      }))
      .filter((edge) => edge.source && edge.target);

    Object.assign(this._layout, {
      graph: {
        nodes,
        edges,
      },
    });
  }

  override async onClear() {
    this.reset();
  }

  abstract findNode(x: number, y: number, radius: number): GraphLayoutNode<NodeData> | undefined;
}
