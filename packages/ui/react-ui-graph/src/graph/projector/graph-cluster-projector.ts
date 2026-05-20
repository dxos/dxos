//
// Copyright 2026 DXOS.org
//

import { cluster as d3Cluster, hierarchy, linkRadial } from 'd3';

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type GraphLayoutEdge, type GraphLayoutNode } from '../types';
import { GraphProjector, type GraphProjectorOptions } from './graph-projector';

export type GraphClusterProjectorOptions = GraphProjectorOptions & {
  /** Reserved space around the cluster (screen pixels). */
  margin?: number;
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
const radialLink = linkRadial<any, any>()
  .angle((d) => d.x)
  .radius((d) => d.y);

/**
 * Radial cluster (d3.cluster) layout. Builds a hierarchy from `parentOf`
 * (defaulting to a flat root → leaves shape) and places leaves around a ring.
 * Edges between hierarchy parents and children get precomputed radial-elbow
 * paths via `edge.path`, so the renderer doesn't need to know about polar
 * coordinates.
 */
export class GraphClusterProjector<
  NodeData = any,
  Options extends GraphClusterProjectorOptions = any,
> extends GraphProjector<NodeData, Options> {
  override findNode(): GraphLayoutNode<NodeData> | undefined {
    return undefined;
  }

  protected override onUpdate(graph?: Graph.Any) {
    log('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    this.mergeData(graph);
    this.doClusterLayout();
    this.emitUpdate('topology');
  }

  private doClusterLayout() {
    if (!this.context.size) {
      return;
    }

    const nodes = this.layout.graph.nodes;
    const edges = this.layout.graph.edges;
    if (!nodes.length) {
      return;
    }

    const groupOf = this.options.groupOf;
    const rootId = this.options.rootId ?? ROOT_ID;

    // Materialize a synthetic group node for each unique group key, then attach
    // leaves under their group (or the root if no group).
    type HierNode = { id: string; parent?: string; node?: GraphLayoutNode<NodeData> };
    const items: HierNode[] = [{ id: rootId }];
    const groupIds = new Map<string, string>();
    for (const node of nodes) {
      const key = groupOf?.(node);
      let parent = rootId;
      if (key !== undefined) {
        let groupId = groupIds.get(key);
        if (!groupId) {
          groupId = `__group__:${key}`;
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
    const radius = Math.max(0, Math.min(width, height) / 2 - margin);

    d3Cluster<HierNode>().size([2 * Math.PI, radius])(root);

    // Polar → Cartesian. Real nodes get their position written back; synthetic
    // group/root nodes get a stub layout node so we can use them as edge endpoints.
    const stubByHierId = new Map<string, GraphLayoutNode<NodeData>>();
    root.each((d: any) => {
      const id = d.data.id;
      const angle = d.x;
      const radius = d.y;
      const x = Math.cos(angle - Math.PI / 2) * radius;
      const y = Math.sin(angle - Math.PI / 2) * radius;
      if (d.data.node) {
        Object.assign(d.data.node, { initialized: true, x, y, r: 4 });
        stubByHierId.set(id, d.data.node);
      } else {
        // Synthetic root / group node: no DOM rendering, just an endpoint anchor.
        stubByHierId.set(id, { id, initialized: true, x, y, r: 0 } as GraphLayoutNode<NodeData>);
      }
    });

    // Precompute radial-elbow paths for the hierarchy's tree edges so the renderer
    // can blit them directly.
    const hierarchyEdges: GraphLayoutEdge<NodeData>[] = [];
    root.links().forEach((link: any) => {
      const sid = link.source.data.id;
      const tid = link.target.data.id;
      const path = radialLink({ source: link.source, target: link.target });
      hierarchyEdges.push({
        id: `__hier__:${sid}->${tid}`,
        type: 'hierarchy',
        source: stubByHierId.get(sid)!,
        target: stubByHierId.get(tid)!,
        path: path ?? undefined,
        data: undefined,
      });
    });

    // Replace existing edges with the precomputed hierarchy edges (the original
    // data-graph edges aren't visualized in the cluster variant — only the tree).
    this.layout.graph.edges = hierarchyEdges;
  }
}
