//
// Copyright 2026 DXOS.org
//

import { type HierarchyPointNode, hierarchy, linkHorizontal, tree as d3Tree } from 'd3';

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type GraphLayoutEdge, type GraphLayoutNode } from '../types';
import { GraphRadialProjector, type GraphRadialProjectorOptions, updateNode } from './graph-radial-projector';

export type GraphTreeProjectorOptions = GraphRadialProjectorOptions & {
  /** Id of the root node, placed at the centre. When unset, falls back to a ring. */
  focus?: string;
  /** Reserved space around the tree (screen pixels). Default 80. */
  margin?: number;
  /** Radius for non-root nodes. Default 6. */
  nodeRadius?: number;
  /** Radius for the root node. Defaults to double the node radius. */
  rootRadius?: number;
  /** Vertical spacing between adjacent rows (px). Default 28. */
  rowGap?: number;
  /** Maximum horizontal spacing between hops (px); the tree centres rather than stretching past this. Default 300. */
  maxColumnGap?: number;
};

/** Node type tags so consumer renderers can distinguish the root, outgoing, and inbound nodes. */
export const TREE_NODE_TYPE_ROOT = 'tree-root';
/** Outgoing descendant (root is an ancestor source), on the right. */
export const TREE_NODE_TYPE_NODE = 'tree-node';
/** Inbound source (an edge points at the root), on the left. */
export const TREE_NODE_TYPE_INBOUND = 'tree-inbound';

const HIER_EDGE_PREFIX = '__tree_hier__:';

/**
 * Horizontal link generator: x is the horizontal (depth) axis, y the vertical (breadth) axis.
 * Our cartesian coordinates already map x→horizontal / y→vertical, so feed them straight through.
 */
const linkPath = linkHorizontal<any, { x: number; y: number }>()
  .x((d) => d.x)
  .y((d) => d.y);

/**
 * Bidirectional Reingold–Tilford "tidy tree" layout (see
 * https://observablehq.com/@observablehq/plot-tree-tidy). The focus node is the root, drawn at the
 * centre. Outgoing edges (the root, then each descendant, is the edge source) form a spanning tree
 * fanning out to the **right**, one column per hop. Inbound edges (an edge whose target is the root)
 * place their source on the **left** as a terminal leaf — the graph is not explored beyond those
 * sources. Cross edges and nodes the directed view does not reach are dropped. Hierarchy links get a
 * `linkHorizontal` `path` recomputed from current endpoints every tick so curves track moving nodes.
 */
export class GraphTreeProjector<
  NodeData = any,
  Options extends GraphTreeProjectorOptions = any,
> extends GraphRadialProjector<NodeData, Options> {
  // Snapshots taken right after mergeData — doTreeLayout reads from these because it overwrites
  // layout.graph.edges with the synthesized hierarchy edges.
  #dataNodes: GraphLayoutNode<NodeData>[] = [];
  #dataEdges: GraphLayoutEdge<NodeData>[] = [];
  #resizeCleanup?: () => void;

  protected override async onStart(): Promise<void> {
    // Re-fit and re-centre on container resize so column spacing (capped at maxColumnGap) stays
    // responsive to the available width; the layout is otherwise only recomputed on data changes.
    this.#resizeCleanup = this.context.resized.on(() => {
      if (this.#dataNodes.length) {
        this.doTreeLayout();
        this.emitUpdate('topology');
        this.animate();
      }
    });
  }

  protected override async onStop(): Promise<void> {
    this.#resizeCleanup?.();
    this.#resizeCleanup = undefined;
    await super.onStop();
  }

  protected override onUpdate(graph?: Graph.Any) {
    log('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    this.mergeData(graph);
    this.#dataNodes = [...this.layout.graph.nodes];
    this.#dataEdges = [...this.layout.graph.edges];
    this.doTreeLayout();
    this.emitUpdate('topology');
    this.animate();
  }

  protected override onTickFrame(_t: number): void {
    for (const edge of this.layout.graph.edges) {
      if (edge.type !== 'hierarchy') {
        continue;
      }
      const { source, target } = edge;
      edge.path =
        linkPath({
          source: { x: source.x ?? 0, y: source.y ?? 0 },
          target: { x: target.x ?? 0, y: target.y ?? 0 },
        }) ?? undefined;
    }
  }

  private doTreeLayout(): void {
    if (!this.context.size) {
      return;
    }

    const dataNodes = this.#dataNodes;
    if (!dataNodes.length) {
      return;
    }

    const focusId = this.options.focus;
    const focusNode = focusId ? dataNodes.find((node) => node.id === focusId) : undefined;

    // No focus (or it dropped out of the graph): degrade to a plain ring so the surface is never blank.
    if (!focusNode) {
      this.doRadialLayout();
      return;
    }

    type HierDatum = { id: string; node?: GraphLayoutNode<NodeData> };
    const nodesById = new Map(dataNodes.map((node) => [node.id, node]));
    const makeDatum = (id: string): HierDatum => ({ id, node: nodesById.get(id) });

    // Directed outgoing adjacency (edge.source → edge.target), in stable edge order.
    const outgoing = new Map<string, string[]>();
    for (const edge of this.#dataEdges) {
      const list = outgoing.get(edge.source.id) ?? [];
      list.push(edge.target.id);
      outgoing.set(edge.source.id, list);
    }

    // Right side: outgoing spanning tree from the focus; the first edge to reach a node fixes its parent.
    const rightChildren = new Map<string, string[]>();
    const visited = new Set<string>([focusId!]);
    let frontier = [focusId!];
    while (frontier.length) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const target of outgoing.get(id) ?? []) {
          if (!visited.has(target)) {
            visited.add(target);
            const list = rightChildren.get(id) ?? [];
            list.push(target);
            rightChildren.set(id, list);
            next.push(target);
          }
        }
      }
      frontier = next;
    }

    // Left side: sources of edges whose target is the focus (inbound), placed as terminal leaves — the
    // graph is not explored beyond them. Skip any already reached by the outgoing tree.
    const leftSources: string[] = [];
    for (const edge of this.#dataEdges) {
      const source = edge.source.id;
      if (edge.target.id === focusId && source !== focusId && !visited.has(source)) {
        visited.add(source);
        leftSources.push(source);
      }
    }

    const rightRoot = hierarchy<HierDatum>(makeDatum(focusId!), (d) => (rightChildren.get(d.id) ?? []).map(makeDatum));
    const leftRoot = hierarchy<HierDatum>(makeDatum(focusId!), (d) =>
      d.id === focusId ? leftSources.map(makeDatum) : [],
    );

    const { width } = this.context.size;
    const margin = this.options.margin ?? 80;
    const rowGap = this.options.rowGap ?? 28;
    // The root is centred, so each side gets half the width. Cap the per-hop spacing and shrink it to
    // fit the deeper side, keeping the layout responsive.
    const maxColumnGap = this.options.maxColumnGap ?? 300;
    const sideDepth = Math.max(1, rightRoot.height, leftRoot.height);
    const columnGap = Math.min(maxColumnGap, Math.max(0, (width / 2 - margin) / sideDepth));

    // nodeSize keeps row/column spacing constant: `x` is the breadth (vertical) coordinate, `y` is
    // `depth * columnGap` (horizontal). `tree()` returns the same root augmented with x/y.
    const layoutTree = d3Tree<HierDatum>().nodeSize([rowGap, columnGap]);
    const rightPoint = layoutTree(rightRoot);
    const leftPoint = layoutTree(leftRoot);

    const nodeR = this.options.nodeRadius ?? 6;
    const rootR = this.options.rootRadius ?? nodeR * 2;

    const placed: GraphLayoutNode<NodeData>[] = [];

    // Root at the centre (origin).
    updateNode(focusNode, [0, 0], rootR);
    focusNode.type = TREE_NODE_TYPE_ROOT;
    placed.push(focusNode);

    // Right side: depth → +x; breadth shifted so the root's breadth maps to the vertical centre.
    const rightBreadth = rightPoint.x;
    rightPoint.each((d) => {
      if (d.data.id === focusId || !d.data.node) {
        return;
      }
      updateNode(d.data.node, [d.y, d.x - rightBreadth], nodeR);
      d.data.node.type = TREE_NODE_TYPE_NODE;
      placed.push(d.data.node);
    });

    // Left side: depth → -x (mirrored); breadth shifted so the root maps to the vertical centre.
    const leftBreadth = leftPoint.x;
    leftPoint.each((d) => {
      if (d.data.id === focusId || !d.data.node) {
        return;
      }
      updateNode(d.data.node, [-d.y, d.x - leftBreadth], nodeR);
      d.data.node.type = TREE_NODE_TYPE_INBOUND;
      placed.push(d.data.node);
    });

    // Only render placed nodes — neighbourhood nodes the directed view doesn't reach are dropped.
    this.layout.graph.nodes = placed;

    // Synthesize hierarchy edges for both sides; paths are filled by onTickFrame from current positions.
    // Left-side links are reversed so the rendered edge keeps the real inbound direction (source → focus)
    // rather than the layout's parent → child (focus → source) orientation.
    const edges: GraphLayoutEdge<NodeData>[] = [];
    const addLinks = (root: HierarchyPointNode<HierDatum>, reverse = false) => {
      root.links().forEach((link) => {
        const parent = link.source.data;
        const child = link.target.data;
        const [from, to] = reverse ? [child, parent] : [parent, child];
        if (!from.node || !to.node) {
          return;
        }
        edges.push({
          id: `${HIER_EDGE_PREFIX}${from.id}->${to.id}`,
          type: 'hierarchy',
          source: from.node,
          target: to.node,
          data: undefined,
        });
      });
    };
    addLinks(rightPoint);
    addLinks(leftPoint, true);
    this.layout.graph.edges = edges;

    // Seed initial paths so the topology emit has correct geometry to enter into the DOM.
    this.onTickFrame(0);
  }
}
