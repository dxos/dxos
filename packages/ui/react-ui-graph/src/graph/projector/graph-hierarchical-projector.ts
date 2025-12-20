//
// Copyright 2025 DXOS.org
//

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type GraphLayoutNode } from '../types';

import { type GraphProjectorOptions } from './graph-projector';
import { GraphRadialProjector, layoutRadial, updateNode } from './graph-radial-projector';

export type GraphHierarchicalProjectorOptions = GraphProjectorOptions & {
  radius?: number;
  margin?: number;
  duration?: number;
};

export class GraphHierarchicalProjector<
  NodeData = any,
  Options extends GraphHierarchicalProjectorOptions = any,
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
        this.doHierarchicalLayout(node);
        return;
      }
    }

    this.doRadialLayout();
  }

  protected doHierarchicalLayout(selected: GraphLayoutNode) {
    if (!this.context.size) {
      return;
    }

    const r2 =
      this.options.radius ??
      Math.min(this.context.size.width, this.context.size.height) / 2 - (this.options.margin ?? 80);
    const r1 = r2 / 2;

    const children = this.layout.graph.edges
      .filter((edge) => edge.source.id === selected.id)
      .map((edge) => edge.target);

    // Root.
    updateNode(selected, [0, 0], 20);

    // Inner.
    {
      const radial = layoutRadial(0, 0, r1, children.length);
      children.forEach((node, i) => {
        const [tx, ty] = radial(i);
        updateNode(node, [tx, ty]);
      });
    }

    // Outer.
    {
      const radial = layoutRadial(0, 0, r2, this.layout.graph.nodes.length - 1 - children.length);
      this.layout.graph.nodes
        .filter((node) => node.id !== selected.id && !children.includes(node))
        .forEach((node, i) => {
          const [tx, ty] = radial(i);
          updateNode(node, [tx, ty]);
        });
    }

    this.animate();
  }
}
