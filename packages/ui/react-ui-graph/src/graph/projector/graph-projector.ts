//
// Copyright 2025 DXOS.org
//

import { type Graph, type SelectionModel } from '@dxos/graph';

import { type SVGContext } from '../../hooks';
import { type GraphLayout, type GraphLayoutNode, emptyGraph } from '../types';

import { Projector, type ProjectorOptions } from './projector';

export type GraphProjectorOptions = ProjectorOptions & {};

/**
 * Base class for graph projectors.
 */
export abstract class GraphProjector<NodeData = any, Options extends GraphProjectorOptions = any> extends Projector<
  Graph.Graph,
  GraphLayout<NodeData>,
  Options
> {
  private readonly _layout: GraphLayout<NodeData>;

  // TODO(burdon): Change to object props.
  constructor(
    context: SVGContext,
    options?: Options,
    private readonly _selection?: SelectionModel,
    layout?: GraphLayout<NodeData>,
  ) {
    super(context, options);
    this._layout = {
      id: (Math.random() * 10).toString().slice(8),
      graph: {
        nodes: [...(layout?.graph.nodes ?? [])],
        edges: [...(layout?.graph.edges ?? [])],
      },
    };
  }

  get layout() {
    return this._layout;
  }

  get selection() {
    return this._selection;
  }

  numChildren(node: GraphLayoutNode) {
    return this._layout.graph.edges.filter((edge) => edge.source.id === this.options.idAccessor(node)).length;
  }

  reset() {
    this._layout.graph.nodes = [];
    this._layout.graph.edges = [];
    this.emitUpdate();
  }

  /**
   * Merge external data with internal representation (e.g., so force properties like position are preserved).
   * @param data
   */
  protected mergeData(data: Graph.Graph = emptyGraph) {
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
