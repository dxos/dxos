//
// Copyright 2025 DXOS.org
//

import { easeCubic, timer, type Timer } from 'd3';

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { GraphProjector, type GraphProjectorOptions } from './graph-projector';
import { type Point } from '../../util';
import { type GraphLayoutNode } from '../types';

export type GraphRadialProjectorOptions = GraphProjectorOptions & {
  radius?: number;
  margin?: number;
  duration?: number;
};

export class GraphRadialProjector<
  NodeData = any,
  Options extends GraphRadialProjectorOptions = any,
> extends GraphProjector<NodeData, Options> {
  private _timer?: Timer;

  override findNode(x: number, y: number, radius: number): GraphLayoutNode<NodeData> | undefined {
    return undefined;
  }

  protected override onUpdate(graph?: Graph) {
    log('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    this.mergeData(graph);
    this.doRadialLayout();
  }

  protected animate() {
    this._timer?.stop();

    const start = Date.now();
    if (this.options.duration) {
      this._timer = timer(() => {
        const t = Math.min(1, (Date.now() - start) / this.options.duration);
        const d = easeCubic(t);

        this.layout.graph.nodes.forEach((node: any) => {
          node.x = node.sx + (node.tx - node.sx) * d;
          node.y = node.sy + (node.ty - node.sy) * d;
          node.r = node.sr + (node.tr - node.sr) * d;
        });

        this.emitUpdate();
        if (t >= 1) {
          this._timer.stop();
          this._timer = undefined;
        }
      });
    } else {
      this.emitUpdate();
    }
  }

  protected override async onStop() {
    this._timer?.stop();
    this._timer = undefined;
  }

  protected doRadialLayout() {
    if (!this.context.size) {
      return;
    }

    const radial = layoutRadial(
      0,
      0,
      this.options.radius ??
        Math.min(this.context.size.width, this.context.size.height) / 2 - (this.options.margin ?? 80),
      this.layout.graph.nodes.length,
    );

    this.layout.graph.nodes.forEach((node, i) => {
      const [tx, ty] = radial(i);
      updateNode(node, [tx, ty]);
    });

    this.animate();
  }
}

/**
 * Update node target.
 */
export const updateNode = (node: GraphLayoutNode, [tx, ty]: Point, tr = 8) => {
  const sx = node.x ?? tx;
  const sy = node.y ?? ty;
  const sr = node.r ?? tr;
  Object.assign(node, {
    initialized: true,
    // Start.
    sx,
    sy,
    sr,
    // Target.
    tx,
    ty,
    tr,
    // Current.
    x: sx,
    y: sy,
    r: sr,
  });
};

/**
 * Get radial position generator.
 */
export const layoutRadial = (x: number, y: number, r: number, n: number, start = -Math.PI / 2) => {
  const da = (2 * Math.PI) / n;
  return (i: number): Point => {
    const a = start + i * da;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  };
};
