//
// Copyright 2025 DXOS.org
//

import { easeCubic, timer, type Timer } from 'd3';

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { GraphProjector, type GraphProjectorOptions } from './graph-projector';
import { type GraphLayoutNode } from './types';

export type GraphRadialProjectorOptions = GraphProjectorOptions & {
  radius?: number;
  border?: number;
};

export class GraphRadialProjector<NodeData = any> extends GraphProjector<NodeData, GraphRadialProjectorOptions> {
  private _timer?: Timer;

  override findNode(x: number, y: number, radius: number): GraphLayoutNode<NodeData> | undefined {
    return undefined;
  }

  protected override onUpdate(graph?: Graph) {
    log('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    this._timer?.stop();
    this.mergeData(graph);

    if (this.context.size) {
      const border = this.options.border ?? 80;
      const r = this.options.radius ?? Math.min(this.context.size.width, this.context.size.height) / 2 - border;
      const da = (2 * Math.PI) / this._layout.graph.nodes.length;
      let a = Math.PI / 2;
      this._layout.graph.nodes.forEach((node) => {
        const tx = Math.cos(a) * r;
        const ty = Math.sin(a) * r;
        const sx = node.x ?? tx;
        const sy = node.y ?? ty;
        Object.assign(node, {
          initialized: true,
          // Start.
          sx,
          sy,
          // Target.
          tx,
          ty,
          // Current.
          x: sx,
          y: sy,
          r: 6,
        });

        a += da;
      });
    }

    // Animate.
    const start = Date.now();
    this._timer = timer(() => {
      const t = Math.min(1, (Date.now() - start) / 1_000);
      const fn = easeCubic(t);

      this._layout.graph.nodes.forEach((node: any) => {
        node.x = node.sx + (node.tx - node.sx) * fn;
        node.y = node.sy + (node.ty - node.sy) * fn;
      });

      this.emitUpdate();
      if (t === 1) {
        this._timer.stop();
        this._timer = undefined;
      }
    });
  }
}
