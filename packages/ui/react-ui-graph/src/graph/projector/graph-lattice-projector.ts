//
// Copyright 2026 DXOS.org
//

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type GraphLayoutNode } from '../types';
import { type GraphRadialProjectorOptions, GraphRadialProjector, updateNode } from './graph-radial-projector';

export type GraphLatticeProjectorOptions = GraphRadialProjectorOptions & {
  /** Reserved space around the lattice (screen pixels). */
  margin?: number;
  /** Node radius used by `renderNode` consumers. Defaults to the force-graph default (6) so animations across variants don't resize nodes. */
  radius?: number;
  /** Sort key for cells; defaults to the node label / id. Same-typename nodes naturally cluster. */
  sortBy?: (node: GraphLayoutNode) => string;
};

/**
 * Lays out nodes as a square-as-possible grid that fits the container.
 * Extends `GraphRadialProjector` to inherit the tween (`updateNode` + `animate`),
 * so switching to / from this layout animates each node from its current
 * position to the grid cell — and the initial mount can also "grow" from
 * existing positions if seeded with a prior projector's layout.
 */
export class GraphLatticeProjector<
  NodeData = any,
  Options extends GraphLatticeProjectorOptions = any,
> extends GraphRadialProjector<NodeData, Options> {
  protected override onUpdate(graph?: Graph.Any) {
    log('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    this.mergeData(graph);
    // Compute layout (assigns sx/sy/tx/ty + initial x/y) BEFORE emitting topology so the
    // renderer's first render uses meaningful positions. animate() then tweens to target.
    this.doLatticeLayout();
    this.emitUpdate('topology');
    this.animate();
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
    // Default radius matches the force-graph default (6) so cross-variant animations
    // tween position only, not size. Consumers can pass a smaller `radius` for a
    // denser matrix look.
    const r = this.options.radius ?? 6;
    // Cell size sets the spacing between nodes. Cap at a small multiple of `r`
    // so the lattice stays tight rather than ballooning to fill the container;
    // wide enough that edges crossing between non-adjacent cells remain visible
    // in the gaps between nodes.
    const fit = Math.min(innerW / columns, innerH / rows);
    const cellSize = Math.max(0, Math.min(fit, r * 6));

    // Center the lattice (SVG viewBox is centered at origin in `<SVG.Root>`).
    const gridW = cellSize * columns;
    const gridH = cellSize * rows;
    const offsetX = -gridW / 2 + cellSize / 2;
    const offsetY = -gridH / 2 + cellSize / 2;

    nodes.forEach((node, i) => {
      const tx = offsetX + (i % columns) * cellSize;
      const ty = offsetY + Math.floor(i / columns) * cellSize;
      updateNode(node, [tx, ty], r);
    });
  }
}
