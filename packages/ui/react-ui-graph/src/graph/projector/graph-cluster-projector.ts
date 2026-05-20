//
// Copyright 2026 DXOS.org
//

import { cluster as d3Cluster, hierarchy, linkRadial } from 'd3';

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type GraphLayoutEdge, type GraphLayoutNode } from '../types';
import { GraphRadialProjector, type GraphRadialProjectorOptions, updateNode } from './graph-radial-projector';

export type GraphClusterProjectorOptions = GraphRadialProjectorOptions & {
  /** Reserved space around the cluster (screen pixels). */
  margin?: number;
  /** Radius for leaf nodes. Default 4. */
  leafRadius?: number;
  /** Radius for the synthetic group nodes (visible as smaller intermediate dots). Default 3. */
  groupRadius?: number;
  /** Radius for the synthetic root node. Default 5. */
  rootRadius?: number;
  /**
   * Group key for each node — synthetic intermediate nodes are created per unique key,
   * giving a root → group → leaf hierarchy. Return `undefined` to attach the node
   * directly to the root.
   */
  groupOf?: (node: GraphLayoutNode) => string | undefined;
  /** Root id used for the synthetic root node. */
  rootId?: string;
  /** Display label set on the synthetic root node. Renderers read `node.label`. */
  rootLabel?: string;
  /** Optional formatter applied to the `groupOf` key to derive the group's display label.
   * Defaults to the key itself. */
  groupLabel?: (key: string) => string;
};

const ROOT_ID = '__cluster_root__';
const GROUP_PREFIX = '__group__:';
const HIER_EDGE_PREFIX = '__hier__:';

/** Node type tags so consumer renderers can distinguish leaves from synthetic structural nodes. */
export const CLUSTER_NODE_TYPE_LEAF = 'leaf';
export const CLUSTER_NODE_TYPE_GROUP = 'group';
export const CLUSTER_NODE_TYPE_ROOT = 'root';

/**
 * Standard d3 radial link generator — `curveBumpRadial`. Same shape as the original
 * `RadialTree` component (and the d3 radial-cluster observable notebook).
 *
 * IMPORTANT: relies on the `dx-edge path` CSS setting `fill: none`. Without that, the SVG
 * default fill (black) closes the curve across the source-target chord and visually
 * swallows part of the stroke. The Graph engine's `createEdge` doesn't set `fill='none'`
 * inline (unlike the original RadialTree), so the rule lives in graph.css.
 */
const linkPath = linkRadial<any, any>()
  .angle((d: any) => d.x)
  .radius((d: any) => d.y);

/**
 * Cartesian → d3-radial polar. d3 measures angle clockwise from "up" (the -y direction).
 * Inverse of `[cos(a - π/2) * r, sin(a - π/2) * r]`.
 */
const cartesianToPolar = (x: number, y: number): { angle: number; radius: number } => ({
  angle: Math.atan2(x, -y),
  radius: Math.hypot(x, y),
});

/**
 * Radial cluster (d3.cluster) layout. Materializes a root → group → leaf
 * hierarchy from the `groupOf` callback, runs d3.cluster, and:
 *
 * - Places leaves around the outer ring; synthetic group nodes sit on an
 *   inner ring; the root sits at the origin. All three kinds are added to the
 *   layout so they render via the consumer's `renderNode` (the `type` field
 *   identifies which is which).
 * - Each hierarchy edge carries a `path` string (d3's `linkRadial` curve)
 *   computed from CURRENT cartesian endpoint positions every frame via
 *   `onTickFrame`. The curve therefore tracks moving endpoints during a
 *   cross-variant tween (e.g. force → cluster) instead of snapping to the
 *   final polar shape.
 */
export class GraphClusterProjector<
  NodeData = any,
  Options extends GraphClusterProjectorOptions = any,
> extends GraphRadialProjector<NodeData, Options> {
  // Synthetic-node ids (root id, or `${GROUP_PREFIX}${key}`) whose subtree is currently
  // hidden. Clicking the corresponding rendered circle calls toggleCollapsed to flip
  // membership, then re-runs the layout so the renderer's exit transition fades the
  // hidden leaves + hierarchy edges out (and back in on expand).
  readonly #collapsed = new Set<string>();

  /** Toggle collapse state for a synthetic node id. Triggers a topology re-emit. */
  toggleCollapsed(id: string): void {
    if (this.#collapsed.has(id)) {
      this.#collapsed.delete(id);
    } else {
      this.#collapsed.add(id);
    }
    // Re-run the layout against the current model data so hidden / re-shown nodes are
    // exited / entered through the renderer's join.
    this.doClusterLayout();
    this.emitUpdate('topology');
    this.animate();
  }

  /** Whether a synthetic-node id is currently collapsed. */
  isCollapsed(id: string): boolean {
    return this.#collapsed.has(id);
  }

  protected override onUpdate(graph?: Graph.Any) {
    log('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    this.mergeData(graph);
    // Compute layout (which mutates nodes + replaces edges with hierarchy edges) BEFORE
    // emitting topology, so the renderer's enter/exit join sees the final node + edge sets.
    this.doClusterLayout();
    this.emitUpdate('topology');
    this.animate();
  }

  /**
   * Recompute each hierarchy edge's `path` from current cartesian source/target positions,
   * so the curves track moving endpoints during a cross-variant tween (e.g. force → cluster)
   * instead of being pinned to the final polar layout.
   */
  protected override onTickFrame(_t: number): void {
    for (const edge of this.layout.graph.edges) {
      if (edge.type !== 'hierarchy') {
        continue;
      }
      const { source, target } = edge;
      const s = cartesianToPolar(source.x ?? 0, source.y ?? 0);
      const t = cartesianToPolar(target.x ?? 0, target.y ?? 0);
      edge.path = linkPath({ source: { x: s.angle, y: s.radius }, target: { x: t.angle, y: t.radius } });
    }
  }

  private doClusterLayout() {
    if (!this.context.size) {
      return;
    }

    const dataNodes = [...this.layout.graph.nodes];
    if (!dataNodes.length) {
      return;
    }

    const groupOf = this.options.groupOf;
    const rootId = this.options.rootId ?? ROOT_ID;

    // Synthesize the hierarchy: root → groups → leaves. `groupKey` is carried on synthetic
    // group HierNodes so the rendered stub can pick up the original groupOf return value
    // (the typename, in plugin-explorer's case) as its display label.
    type HierNode = { id: string; parent?: string; node?: GraphLayoutNode<NodeData>; groupKey?: string };
    const items: HierNode[] = [{ id: rootId }];
    const groupIds = new Map<string, string>();
    // Collapsed root → render only the root circle (no groups, no leaves).
    const rootCollapsed = this.#collapsed.has(rootId);
    if (!rootCollapsed) {
      for (const node of dataNodes) {
        const key = groupOf?.(node);
        let parent = rootId;
        if (key !== undefined) {
          let groupId = groupIds.get(key);
          if (!groupId) {
            groupId = `${GROUP_PREFIX}${key}`;
            groupIds.set(key, groupId);
            items.push({ id: groupId, parent: rootId, groupKey: key });
          }
          parent = groupId;
        }
        // Collapsed group → drop its leaves. The group itself still renders so the user
        // can click it again to expand.
        if (this.#collapsed.has(parent)) {
          continue;
        }
        items.push({ id: node.id, parent, node });
      }
    }

    const childrenByParent = new Map<string, HierNode[]>();
    for (const item of items) {
      if (item.parent) {
        const list = childrenByParent.get(item.parent) ?? [];
        list.push(item);
        childrenByParent.set(item.parent, list);
      }
    }

    const root = hierarchy<HierNode>({ id: rootId }, (d) => childrenByParent.get(d.id) ?? []);

    const { width, height } = this.context.size;
    const margin = this.options.margin ?? 80;
    const ringRadius = Math.max(0, Math.min(width, height) / 2 - margin);

    d3Cluster<HierNode>()
      .size([2 * Math.PI, ringRadius])
      // Tighter sibling spacing at deeper levels — matches the previous standalone
      // RadialTree component. Without the `/depth` divisor, large groups span a
      // wide angular arc; the linkRadial(curveBumpPolar) curve to a leaf at the
      // edge of that arc then has its control points placed far apart in
      // cartesian, producing a wide swoop that visually misses the target.
      .separation((a: any, b: any) => (a.parent === b.parent ? 1 : 2) / Math.max(1, a.depth))(root);

    const leafR = this.options.leafRadius ?? 4;
    const groupR = this.options.groupRadius ?? 3;
    const rootR = this.options.rootRadius ?? 5;

    // Build the new node set: existing data nodes (re-positioned), plus synthetic root + groups.
    const syntheticNodes = new Map<string, GraphLayoutNode<NodeData>>();
    root.each((d: any) => {
      const id = d.data.id;
      const angle = d.x;
      const radius = d.y;
      const x = Math.cos(angle - Math.PI / 2) * radius;
      const y = Math.sin(angle - Math.PI / 2) * radius;

      if (d.data.node) {
        // Real leaf — tween its position.
        updateNode(d.data.node, [x, y], leafR);
        (d.data.node as any).type = CLUSTER_NODE_TYPE_LEAF;
      } else {
        // Synthetic root or group. These have no presence in the previous projector's layout
        // (force / lattice) so seed their starting position at origin — the root then stays
        // put while groups grow outward to their inner ring, framing the leaf transition.
        const isRoot = id === rootId;
        const existing = syntheticNodes.get(id);
        const stub = existing ?? ({ id, x: 0, y: 0 } as GraphLayoutNode<NodeData>);
        updateNode(stub, [x, y], isRoot ? rootR : groupR);
        stub.type = isRoot ? CLUSTER_NODE_TYPE_ROOT : CLUSTER_NODE_TYPE_GROUP;
        // Surface a display label so renderNode callbacks don't have to parse internal ids.
        if (isRoot) {
          stub.label = this.options.rootLabel;
        } else if (d.data.groupKey !== undefined) {
          stub.label = this.options.groupLabel ? this.options.groupLabel(d.data.groupKey) : d.data.groupKey;
        }
        syntheticNodes.set(id, stub);
      }
    });

    // Compose the rendered node list: synthetic structure first (so leaves draw on top).
    // Only include data nodes that survived the collapse filter — d3.cluster ran on the
    // synthesized hierarchy, so any leaf NOT in `visibleLeafIds` got no polar position
    // and would otherwise render at stale coordinates.
    const visibleLeafIds = new Set<string>();
    for (const item of items) {
      if (item.node) {
        visibleLeafIds.add(item.id);
      }
    }
    const nextNodes: GraphLayoutNode<NodeData>[] = [];
    for (const stub of syntheticNodes.values()) {
      nextNodes.push(stub);
    }
    for (const node of dataNodes) {
      if (visibleLeafIds.has(node.id)) {
        nextNodes.push(node);
      }
    }
    this.layout.graph.nodes = nextNodes;

    // Build hierarchy edges referencing source/target nodes. The `path` is filled by
    // onTickFrame (and again per tween frame) from current cartesian positions, so we
    // don't precompute it here — leaving it undefined would briefly produce a straight
    // line on first paint, but the tween's first tick (t=0) writes the correct path
    // before the renderer's positions-emit reaches the DOM.
    const hierarchyEdges: GraphLayoutEdge<NodeData>[] = [];
    root.links().forEach((link: any) => {
      const sid = link.source.data.id;
      const tid = link.target.data.id;
      const sourceNode = link.source.data.node ?? syntheticNodes.get(sid);
      const targetNode = link.target.data.node ?? syntheticNodes.get(tid);
      hierarchyEdges.push({
        id: `${HIER_EDGE_PREFIX}${sid}->${tid}`,
        type: 'hierarchy',
        source: sourceNode!,
        target: targetNode!,
        data: undefined,
      });
    });
    this.layout.graph.edges = hierarchyEdges;
    // Seed initial paths so the topology emit has correct geometry to enter into the DOM.
    this.onTickFrame(0);
  }
}
