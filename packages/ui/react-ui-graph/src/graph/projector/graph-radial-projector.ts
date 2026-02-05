//
// Copyright 2025 DXOS.org
//

import { type Timer, easeCubic, timer } from 'd3';

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type Point } from '../../util';
import { type GraphLayoutNode } from '../types';

import { GraphProjector, type GraphProjectorOptions } from './graph-projector';

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

  protected override onUpdate(graph?: Graph.Any) {
    log('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    this.mergeData(graph);
    this.doRadialLayout();
  }

  protected animate() {
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
 * Radial position generator.
 */
export const layoutRadial = (x: number, y: number, r: number, n: number, start = -Math.PI / 2) => {
  const da = (2 * Math.PI) / n;
  return (i: number): Point => {
    const a = start + i * da;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  };
};

/**
 * Horizontal position generator.
 */
export const layoutHorizontal = (x: number, y: number, w: number, n: number) => {
  const dx = n > 1 ? w / (n - 1) : 0;
  const sx = x - ((n - 1) * dx) / 2;
  return (i: number): Point => {
    return [sx + i * dx, y];
  };
};

/**
 * Vertical position generator.
 */
export const layoutVertical = (x: number, y: number, h: number, n: number) => {
  const dy = n > 1 ? h / (n - 1) : 0;
  const sy = y - ((n - 1) * dy) / 2;
  return (i: number): Point => {
    return [x, sy + i * dy];
  };
};
