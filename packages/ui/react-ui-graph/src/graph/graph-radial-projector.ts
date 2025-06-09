//
// Copyright 2025 DXOS.org
//

import { type Graph } from '@dxos/graph';

import { GraphProjector, type GraphProjectorOptions } from './graph-projector';
import { type GraphLayoutNode } from './types';

export type GraphRadialProjectorOptions = GraphProjectorOptions & {
  radius?: number;
  border?: number;
};

export class GraphRadialProjector<NodeData = any> extends GraphProjector<NodeData, GraphRadialProjectorOptions> {
  override findNode(x: number, y: number, radius: number): GraphLayoutNode<NodeData> | undefined {
    return undefined;
  }

  protected override onUpdate(graph?: Graph) {
    this.triggerUpdate();
    this.mergeData(graph);

    // TODO(burdon): Tween initial positions.
    if (this.context.size) {
      const border = this.options.border ?? 80;
      const r = this.options.radius ?? Math.min(this.context.size.width, this.context.size.height) / 2 - border;
      const da = (2 * Math.PI) / this._layout.graph.nodes.length;
      let a = Math.PI / 2;
      this._layout.graph.nodes.forEach((node) => {
        Object.assign(node, {
          initialized: true,
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
          r: 6,
        });

        a += da;
      });
    }

    this.triggerUpdate();
  }
}
