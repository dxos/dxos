//
// Copyright 2026 DXOS.org
//

import { cluster as d3Cluster, hierarchy, linkRadial } from 'd3';

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type GraphLayoutEdge, type GraphLayoutNode } from '../types';
import {
  type GraphRadialProjectorOptions,
  GraphRadialProjector,
  layoutRadial,
  updateNode,
} from './graph-radial-projector';

/** Display info for a relation group. */
export type PlexusRelation = {
  /** Stable grouping key — edges sharing a key fan out from the same relation node. */
  key: string;
  /** Human-readable label rendered on the relation node. */
  label: string;
};

export type GraphPlexusProjectorOptions = GraphRadialProjectorOptions & {
  /** Id of the focused node placed at the centre. When unset the layout falls back to a plain ring. */
  focus?: string;
  /** Reserved space around the outer ring (screen pixels). Default 100. */
  margin?: number;
  /** Radius for object leaf nodes — the base size shared by all non-focus nodes. Default 5. */
  leafRadius?: number;
  /** Radius for the synthetic relation nodes. Defaults to the leaf radius. */
  relationRadius?: number;
  /** Radius for the focused centre node. Defaults to double the leaf radius. */
  focusRadius?: number;
  /**
   * Classify an edge incident to the focus into a relation group. Return `undefined` to
   * ignore the edge (e.g. when the focus is not one of the edge's endpoints). The neighbour
   * placed under the relation is the edge endpoint that is NOT the focus, so both sides of a
   * relation are supported: classify outgoing edges (focus is source) and incoming edges
   * (focus is target) under different keys to get a separate relation node for each side.
   * Mirrors the `groupOf` callback used by the cluster / bundle projectors — all ECHO
   * knowledge stays in the consumer.
   */
  relationOf?: (edge: GraphLayoutEdge, focusId: string) => PlexusRelation | undefined;
};

const RELATION_PREFIX = '__plexus_relation__:';
const HIER_EDGE_PREFIX = '__plexus_hier__:';

/** Node type tags so consumer renderers can distinguish the three kinds of node. */
export const PLEXUS_NODE_TYPE_FOCUS = 'plexus-focus';
export const PLEXUS_NODE_TYPE_RELATION = 'plexus-relation';
export const PLEXUS_NODE_TYPE_OBJECT = 'plexus-object';

/**
 * Standard d3 radial link generator — `curveBumpRadial` (same as the cluster projector).
 * Relies on `dx-edge path { fill: none }` from graph.css.
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
 * Focus-centric radial layout. A single focused object sits at the centre; its immediate
 * neighbourhood fans out around it, grouped by the relation that connects each neighbour
 * to the focus:
 *
 * - **Focus** (depth 0) — the focused data node, at the origin.
 * - **Relation nodes** (depth 1) — synthetic group nodes (one per `relationOf` key) on an
 *   inner ring.
 * - **Object nodes** (depth 2) — the neighbours reached through each relation, on the
 *   outer ring.
 *
 * Built on the same `d3.cluster` machinery as `GraphClusterProjector`: the synthesized
 * `focus → relation → object` hierarchy is laid out radially and each hierarchy edge gets
 * a `linkRadial` `path` recomputed from current cartesian endpoints every tick, so curves
 * track moving nodes during a cross-focus (or cross-variant) tween.
 *
 * Focus itself is owned by the consumer (passed via `options.focus`); re-focusing is a
 * matter of recreating the projector with the new focus and the previous layout as `prev`,
 * which makes persistent nodes animate into their new positions.
 */
export class GraphPlexusProjector<
  NodeData = any,
  Options extends GraphPlexusProjectorOptions = any,
> extends GraphRadialProjector<NodeData, Options> {
  // Full node / edge snapshots taken right after mergeData — doPlexusLayout reads from
  // these because it overwrites layout.graph with the filtered focus-centric view.
  #dataNodes: GraphLayoutNode<NodeData>[] = [];
  #dataEdges: GraphLayoutEdge<NodeData>[] = [];

  protected override onUpdate(graph?: Graph.Any) {
    log('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    this.mergeData(graph);
    this.#dataNodes = [...this.layout.graph.nodes];
    this.#dataEdges = [...this.layout.graph.edges];
    this.doPlexusLayout();
    this.emitUpdate('topology');
    this.animate();
  }

  /**
   * Recompute each hierarchy edge's `path` from current cartesian endpoints so curves track
   * moving nodes during the tween (identical strategy to the cluster projector).
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

  private doPlexusLayout() {
    if (!this.context.size) {
      return;
    }

    const dataNodes = this.#dataNodes;
    if (!dataNodes.length) {
      return;
    }

    const focusId = this.options.focus;
    const focusNode = focusId ? dataNodes.find((node) => node.id === focusId) : undefined;

    // No focus (or it dropped out of the graph): degrade to a plain ring of all nodes so the
    // surface is never blank. In practice the consumer dispatches to the bundle projector
    // when there is no focus, so this is just a safety net.
    if (!focusNode) {
      const radial = layoutRadial(
        0,
        0,
        Math.min(this.context.size.width, this.context.size.height) / 2 - (this.options.margin ?? 100),
        dataNodes.length,
      );
      dataNodes.forEach((node, index) => updateNode(node, radial(index), this.options.leafRadius ?? 5));
      this.layout.graph.nodes = dataNodes;
      this.layout.graph.edges = [];
      this.animate();
      return;
    }

    const relationOf = this.options.relationOf ?? defaultRelationOf;

    // Group neighbours by relation. A neighbour reachable through more than one relation is
    // placed once (first relation wins) — keeps hierarchy ids unique for v1.
    type Group = { id: string; label: string; leaves: GraphLayoutNode<NodeData>[] };
    const groups = new Map<string, Group>();
    const placed = new Set<string>([focusId!]);
    for (const edge of this.#dataEdges) {
      const relation = relationOf(edge, focusId!);
      if (!relation) {
        continue;
      }
      const neighbour = edge.source.id === focusId ? edge.target : edge.source;
      if (placed.has(neighbour.id)) {
        continue;
      }
      placed.add(neighbour.id);
      let group = groups.get(relation.key);
      if (!group) {
        group = { id: `${RELATION_PREFIX}${relation.key}`, label: relation.label, leaves: [] };
        groups.set(relation.key, group);
      }
      group.leaves.push(neighbour);
    }

    // Synthesize the focus → relation → object hierarchy.
    type HierNode = {
      id: string;
      parent?: string;
      node?: GraphLayoutNode<NodeData>;
      relationLabel?: string;
    };
    const items: HierNode[] = [{ id: focusId!, node: focusNode }];
    for (const group of groups.values()) {
      items.push({ id: group.id, parent: focusId, relationLabel: group.label });
      for (const leaf of group.leaves) {
        items.push({ id: leaf.id, parent: group.id, node: leaf });
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

    const root = hierarchy<HierNode>({ id: focusId!, node: focusNode }, (d) => childrenByParent.get(d.id) ?? []);

    const { width, height } = this.context.size;
    const margin = this.options.margin ?? 100;
    const ringRadius = Math.max(0, Math.min(width, height) / 2 - margin);

    d3Cluster<HierNode>()
      .size([2 * Math.PI, ringRadius])
      .separation((a: any, b: any) => (a.parent === b.parent ? 1 : 2) / Math.max(1, a.depth))(root);

    // All non-focus nodes share the leaf radius; the focus is double.
    const leafR = this.options.leafRadius ?? 5;
    const relationR = this.options.relationRadius ?? leafR;
    const focusR = this.options.focusRadius ?? leafR * 2;

    // Reuse synthetic relation stubs from the previous pass so their current x/y becomes the
    // tween start instead of snapping to the origin first.
    const prevStubsById = new Map<string, GraphLayoutNode<NodeData>>();
    for (const node of this.layout.graph.nodes) {
      if (node.type === PLEXUS_NODE_TYPE_RELATION) {
        prevStubsById.set(node.id, node);
      }
    }

    const relationStubs = new Map<string, GraphLayoutNode<NodeData>>();
    root.each((d: any) => {
      const angle = d.x;
      const radius = d.y;
      const x = Math.cos(angle - Math.PI / 2) * radius;
      const y = Math.sin(angle - Math.PI / 2) * radius;
      const id = d.data.id;

      if (id === focusId) {
        // Real focus node at the centre.
        updateNode(focusNode, [x, y], focusR);
        (focusNode as any).type = PLEXUS_NODE_TYPE_FOCUS;
        focusNode.hidden = false;
      } else if (d.data.node) {
        // Real object leaf.
        updateNode(d.data.node, [x, y], leafR);
        (d.data.node as any).type = PLEXUS_NODE_TYPE_OBJECT;
        d.data.node.hidden = false;
      } else {
        // Synthetic relation node.
        const stub = prevStubsById.get(id) ?? ({ id, x: 0, y: 0 } as GraphLayoutNode<NodeData>);
        updateNode(stub, [x, y], relationR);
        stub.type = PLEXUS_NODE_TYPE_RELATION;
        stub.label = d.data.relationLabel;
        relationStubs.set(id, stub);
      }
    });

    // Compose the rendered node list: relations first, then leaves, focus last (drawn on top).
    const nextNodes: GraphLayoutNode<NodeData>[] = [];
    for (const stub of relationStubs.values()) {
      nextNodes.push(stub);
    }
    for (const group of groups.values()) {
      for (const leaf of group.leaves) {
        nextNodes.push(leaf);
      }
    }
    nextNodes.push(focusNode);
    this.layout.graph.nodes = nextNodes;

    // Build hierarchy edges (focus → relation, relation → object). Paths are filled by
    // onTickFrame from current cartesian positions.
    const edges: GraphLayoutEdge<NodeData>[] = [];
    root.links().forEach((link: any) => {
      const sid = link.source.data.id;
      const tid = link.target.data.id;
      const sourceNode = sid === focusId ? focusNode : (link.source.data.node ?? relationStubs.get(sid));
      const targetNode = link.target.data.node ?? relationStubs.get(tid);
      if (!sourceNode || !targetNode) {
        return;
      }
      edges.push({
        id: `${HIER_EDGE_PREFIX}${sid}->${tid}`,
        type: 'hierarchy',
        source: sourceNode,
        target: targetNode,
        data: undefined,
      });
    });
    this.layout.graph.edges = edges;

    // Seed initial paths so the topology emit has correct geometry to enter into the DOM.
    this.onTickFrame(0);
  }
}

/** Fallback grouping: every edge incident to the focus becomes a relation keyed by edge type + direction. */
const defaultRelationOf = (edge: GraphLayoutEdge, focusId: string): PlexusRelation | undefined => {
  const outgoing = edge.source.id === focusId;
  const incoming = edge.target.id === focusId;
  if (!outgoing && !incoming) {
    return undefined;
  }
  const type = edge.type ?? 'edge';
  const arrow = outgoing ? '→' : '←';
  return { key: `${type}:${outgoing ? 'out' : 'in'}`, label: `${type} ${arrow}` };
};
