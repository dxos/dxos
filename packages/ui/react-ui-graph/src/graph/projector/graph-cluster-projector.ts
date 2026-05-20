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
};

const ROOT_ID = '__cluster_root__';
const GROUP_PREFIX = '__group__:';
const HIER_EDGE_PREFIX = '__hier__:';

/** Node type tags so consumer renderers can distinguish leaves from synthetic structural nodes. */
export const CLUSTER_NODE_TYPE_LEAF = 'leaf';
export const CLUSTER_NODE_TYPE_GROUP = 'group';
export const CLUSTER_NODE_TYPE_ROOT = 'root';

const radialLink = linkRadial<any, any>()
  .angle((d) => d.x)
  .radius((d) => d.y);

/**
 * Radial cluster (d3.cluster) layout. Materializes a root → group → leaf
 * hierarchy from the `groupOf` callback, runs d3.cluster, and:
 *
 * - Places leaves around the outer ring; synthetic group nodes sit on an
 *   inner ring; the root sits at the origin. All three kinds are added to the
 *   layout so they render via the consumer's `renderNode` (the `type` field
 *   identifies which is which).
 * - Computes radial-elbow `path` strings on each hierarchy edge so the
 *   renderer doesn't need to know about polar coordinates.
 *
 * The precomputed paths are fixed at the d3.cluster polar layout — they
 * don't follow per-frame tweens. Pair this projector with a no-duration
 * animate() (i.e. `duration: undefined`) so the layout snaps directly to
 * the target and node + path endpoints always coincide.
 */
export class GraphClusterProjector<
  NodeData = any,
  Options extends GraphClusterProjectorOptions = any,
> extends GraphRadialProjector<NodeData, Options> {
  protected override onUpdate(graph?: Graph.Any) {
    log('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    this.mergeData(graph);
    // Compute layout (which mutates nodes + replaces edges with hierarchy edges) BEFORE
    // emitting topology, so the renderer's enter/exit join sees the final node + edge sets.
    this.doClusterLayout();
    this.emitUpdate('topology');
    this.animate();
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

    // Synthesize the hierarchy: root → groups → leaves.
    type HierNode = { id: string; parent?: string; node?: GraphLayoutNode<NodeData> };
    const items: HierNode[] = [{ id: rootId }];
    const groupIds = new Map<string, string>();
    for (const node of dataNodes) {
      const key = groupOf?.(node);
      let parent = rootId;
      if (key !== undefined) {
        let groupId = groupIds.get(key);
        if (!groupId) {
          groupId = `${GROUP_PREFIX}${key}`;
          groupIds.set(key, groupId);
          items.push({ id: groupId, parent: rootId });
        }
        parent = groupId;
      }
      items.push({ id: node.id, parent, node });
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

    d3Cluster<HierNode>().size([2 * Math.PI, ringRadius])(root);

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
        // Synthetic root or group — also tween position (so it slides in from prior layouts).
        const isRoot = id === rootId;
        const stub = syntheticNodes.get(id) ?? ({ id } as GraphLayoutNode<NodeData>);
        updateNode(stub, [x, y], isRoot ? rootR : groupR);
        stub.type = isRoot ? CLUSTER_NODE_TYPE_ROOT : CLUSTER_NODE_TYPE_GROUP;
        syntheticNodes.set(id, stub);
      }
    });

    // Compose the rendered node list: synthetic structure first (so leaves draw on top).
    const nextNodes: GraphLayoutNode<NodeData>[] = [];
    for (const stub of syntheticNodes.values()) {
      nextNodes.push(stub);
    }
    for (const node of dataNodes) {
      nextNodes.push(node);
    }
    this.layout.graph.nodes = nextNodes;

    // Precompute initial edge paths against d3.cluster polar coords so the topology
    // render has something to draw. `onTickFrame` will overwrite per animation frame
    // from current cartesian positions, keeping edges glued to nodes during the tween.
    const hierarchyEdges: GraphLayoutEdge<NodeData>[] = [];
    root.links().forEach((link: any) => {
      const sid = link.source.data.id;
      const tid = link.target.data.id;
      const path = radialLink({ source: link.source, target: link.target });
      const sourceNode = link.source.data.node ?? syntheticNodes.get(sid);
      const targetNode = link.target.data.node ?? syntheticNodes.get(tid);
      hierarchyEdges.push({
        id: `${HIER_EDGE_PREFIX}${sid}->${tid}`,
        type: 'hierarchy',
        source: sourceNode!,
        target: targetNode!,
        path: path ?? undefined,
        data: undefined,
      });
    });
    this.layout.graph.edges = hierarchyEdges;
  }
}
