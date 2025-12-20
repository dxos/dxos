//
// Copyright 2025 DXOS.org
//

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type GraphLayoutNode } from '../types';

import { type GraphProjectorOptions } from './graph-projector';
import { GraphRadialProjector, layoutHorizontal, layoutRadial, updateNode } from './graph-radial-projector';

export type GraphRelationalProjectorOptions = GraphProjectorOptions & {
  radius?: number;
  margin?: number;
  duration?: number;
};

export class GraphRelationalProjector<
  NodeData = any,
  Options extends GraphRelationalProjectorOptions = any,
> extends GraphRadialProjector<NodeData, Options> {
  protected override onUpdate(graph?: Graph.Graph) {
    log('onUpdate', {
      graph: { nodes: graph?.nodes.length, edges: graph?.edges.length },
      selection: this.selection?.selected.value,
    });

    this.mergeData(graph);
    const selected = this.selection?.selected.value?.[0];
    if (selected) {
      const node = this.layout.graph.nodes.find((node) => node.id === selected);
      if (node) {
        this.doRelationalLayout(node);
        return;
      }
    }

    this.doRadialLayout();
  }

  protected doRelationalLayout(selected: GraphLayoutNode) {
    if (!this.context.size) {
      return;
    }

    // TODO(burdon): Generate edge types.
    const r2 =
      this.options.radius ??
      Math.min(this.context.size.width, this.context.size.height) / 2 - (this.options.margin ?? 80);
    const r1 = r2 * 0.5;

    this.layout.graph.nodes.forEach((node) => (node.type = undefined));
    this.layout.graph.edges.forEach((edge) => {
      edge.order = 0;
      edge.type = undefined;
    });

    const children = this.layout.graph.edges
      .filter((edge) => edge.source.id === selected.id)
      .map((edge) => {
        edge.order = 1;
        edge.type = '1';
        edge.target.type = '1';
        return edge.target;
      });

    const parents = this.layout.graph.edges
      .filter((edge) => edge.target.id === selected.id)
      .map((edge) => {
        edge.order = 2;
        edge.type = '2';
        edge.source.type = '2';
        return edge.source;
      });

    // Root.
    updateNode(selected, [0, 0], 30);

    // Children.
    {
      const vertical = layoutHorizontal(0, r1, r1 * 2, children.length);
      children.forEach((node, i) => {
        const [tx, ty] = vertical(i);
        updateNode(node, [tx, ty], 20);
      });
    }

    // Parents.
    {
      const vertical = layoutHorizontal(0, -r1, r1, parents.length);
      parents.forEach((node, i) => {
        const [tx, ty] = vertical(i);
        updateNode(node, [tx, ty], 20);
      });
    }

    // Outer.
    {
      const radial = layoutRadial(0, 0, r2, this.layout.graph.nodes.length - 1 - children.length - parents.length);
      this.layout.graph.nodes
        .filter((node) => node.id !== selected.id && !children.includes(node) && !parents.includes(node))
        .forEach((node, i) => {
          const [tx, ty] = radial(i);
          updateNode(node, [tx, ty]);
        });
    }

    this.animate();
  }
}
