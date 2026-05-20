//
// Copyright 2026 DXOS.org
//

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type GraphLayoutNode } from '../types';
import { GraphProjector, type GraphProjectorOptions } from './graph-projector';

export type GraphLatticeProjectorOptions = GraphProjectorOptions & {
  /** Reserved space around the lattice (screen pixels). */
  margin?: number;
  /** Sort key for cells; defaults to the node label / id. Same-typename nodes naturally cluster. */
  sortBy?: (node: GraphLayoutNode) => string;
};

/**
 * Lays out nodes as a square-as-possible grid that fits the container.
 * No ticks — `onUpdate` computes final positions and emits a single 'topology'.
 * Pair with a custom `renderNode` (e.g. rounded rect) for a "cards" look.
 */
export class GraphLatticeProjector<
  NodeData = any,
  Options extends GraphLatticeProjectorOptions = any,
> extends GraphProjector<NodeData, Options> {
  override findNode(): GraphLayoutNode<NodeData> | undefined {
    return undefined;
  }

  protected override onUpdate(graph?: Graph.Any) {
    log('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    this.mergeData(graph);
    // Lattices don't visualize relations — drop any edges merged from the source graph.
    this.layout.graph.edges = [];
    this.doLatticeLayout();
    this.emitUpdate('topology');
  }

  private doLatticeLayout() {
    if (!this.context.size) {
      return;
    }

    const nodes = this.layout.graph.nodes;
    const count = nodes.length;
    if (!count) {
      return;
    }

    const sortBy = this.options.sortBy ?? ((n: GraphLayoutNode) => (n.data as any)?.label ?? n.id);
    nodes.sort((a, b) => sortBy(a).localeCompare(sortBy(b)));

    // Columns ≈ √N so the grid stays as square as possible.
    const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
    const rows = Math.ceil(count / columns);

    const margin = this.options.margin ?? 16;
    const { width, height } = this.context.size;
    const innerW = Math.max(0, width - 2 * margin);
    const innerH = Math.max(0, height - 2 * margin);
    const cellSize = Math.max(0, Math.min(innerW / columns, innerH / rows));
    const r = Math.max(2, Math.min(cellSize * 0.4, 32));

    // Center the lattice (SVG viewBox is centered at origin in `<SVG.Root>`).
    const gridW = cellSize * columns;
    const gridH = cellSize * rows;
    const offsetX = -gridW / 2 + cellSize / 2;
    const offsetY = -gridH / 2 + cellSize / 2;

    nodes.forEach((node, i) => {
      Object.assign(node, {
        initialized: true,
        x: offsetX + (i % columns) * cellSize,
        y: offsetY + Math.floor(i / columns) * cellSize,
        r,
      });
    });
  }
}
