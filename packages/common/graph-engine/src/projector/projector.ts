//
// Copyright 2026 DXOS.org
//

import { type Graph } from '@dxos/graph';

import { EventEmitter } from '../event-emitter';
import { type LayoutGraph, type LayoutNode } from '../types';

/**
 * Projector base. Subclasses translate a `Graph` into a `LayoutGraph` and publish targets each tick.
 */
export abstract class Projector<NodeData = any, EdgeData = any> {
  readonly updated = new EventEmitter<{ layout: LayoutGraph<NodeData, EdgeData> }>();

  abstract get layout(): LayoutGraph<NodeData, EdgeData>;

  /**
   * Called when the underlying graph changes.
   */
  updateData(graph: Graph.Any | undefined): void {
    this.onUpdate(graph ?? { nodes: [], edges: [] });
    this.updated.emit({ layout: this.layout });
  }

  /**
   * Called each frame. Return true if the projector still wants more frames.
   */
  tick(dt: number): boolean {
    const more = this.onTick(dt);
    this.updated.emit({ layout: this.layout });
    return more;
  }

  abstract findNode(x: number, y: number, radius: number): LayoutNode<NodeData> | undefined;

  start(): void {}
  stop(): void {}

  protected abstract onUpdate(graph: Graph.Any): void;
  protected abstract onTick(dt: number): boolean;
}
