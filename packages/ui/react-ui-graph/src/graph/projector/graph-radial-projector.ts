//
// Copyright 2025 DXOS.org
//

import { type Timer, easeCubic, timer } from 'd3';

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type Point } from '../../util';
import { type GraphLayoutNode } from '../types';
import { type GraphProjectorOptions, GraphProjector } from './graph-projector';

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
    // Bind enter/exit once before the tween starts; subsequent animate frames emit 'positions'.
    this.emitUpdate('topology');
    this.doRadialLayout();
  }

  protected animate() {
    // Cancel any in-flight tween so a fresh onUpdate doesn't race against the
    // previous timer (both would be mutating x/y at different rates).
    this._timer?.stop();
    this._timer = undefined;

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

        // Subclass hook: derived projectors (e.g. cluster) can mutate edge.path
        // here so curves track moving endpoints during the tween. The renderer's
        // applyPositions reads edge.path fresh each frame.
        this.onTickFrame(d);

        // Tween frames only mutate `x/y/r`; emit 'positions' so the renderer can fast-path.
        this.emitUpdate('positions');
        if (t >= 1) {
          this._timer.stop();
          this._timer = undefined;
        }
      });
    } else {
      // No duration: snap nodes to their target. Without this the layout would
      // sit at `sx/sy/sr` (= previous positions) and never reach the new target.
      this.layout.graph.nodes.forEach((node: any) => {
        node.x = node.tx;
        node.y = node.ty;
        node.r = node.tr;
      });
      this.onTickFrame(1);
      this.emitUpdate('positions');
    }
  }

  /**
   * Per-frame hook called after node x/y/r are interpolated and before the
   * 'positions' emit. Subclasses override to update edge geometry (`edge.path`)
   * so curves stay glued to moving endpoints. `t` is the eased progress in [0, 1].
   */
  protected onTickFrame(t: number): void {}

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
