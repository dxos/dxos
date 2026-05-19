//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type SpaceGraphEdge, type SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';

import { type BundleEdge } from './layout';
import { type TreeNode } from './types';

const ROOT_ID = 'db:root';
const SCHEMA_PREFIX = 'schema:';

const truncate = (id: string) => `${id.slice(0, 4)}…${id.slice(-4)}`;

const labelOf = (node: SpaceGraphNode): string => node.data?.label ?? truncate(node.id);

export type SpaceGraphHierarchy = {
  /** Hierarchy where leaves carry the underlying ECHO object on `node.data`. */
  tree: TreeNode<Obj.Unknown>;
  /** Edges between leaf objects derived from relations and refs in the graph. */
  edges: BundleEdge[];
};

export type SpaceGraphHierarchyOptions = {
  rootLabel?: string;
  rootId?: string;
};

/**
 * Convert a {@link SpaceGraphModel} graph into a hierarchy suitable for the cluster / bundling layouts:
 *
 *     Root (db)
 *     ├── Schema A
 *     │   ├── Object a1
 *     │   └── Object a2
 *     └── Schema B
 *         └── Object b1
 *
 * Leaves are ECHO objects. Their schema typename is the intermediate group.
 * `rootLabel` is shown on the root node (typically the database name or "Space").
 *
 * `edges` exposes object-to-object edges (relations + refs) so the bundling
 * layout can route bundled curves between leaves through their common ancestor.
 */
export const spaceGraphToHierarchy = (
  model: SpaceGraphModel,
  { rootLabel = 'Database', rootId = ROOT_ID }: SpaceGraphHierarchyOptions = {},
): SpaceGraphHierarchy => {
  const graph = model.graph;
  const objectNodes = graph.nodes.filter((node) => node.type === 'object');

  // Group object nodes by typename. Fall back to '(untyped)' so they stay visible.
  const byTypename = new Map<string, SpaceGraphNode[]>();
  for (const node of objectNodes) {
    const obj = node.data?.object as Obj.Unknown | undefined;
    const typename = (obj && Obj.getTypename(obj)) ?? '(untyped)';
    const bucket = byTypename.get(typename) ?? [];
    bucket.push(node);
    byTypename.set(typename, bucket);
  }

  const tree: TreeNode<Obj.Unknown> = {
    id: rootId,
    label: rootLabel,
    children: Array.from(byTypename.entries()).map(([typename, nodes]) => ({
      id: `${SCHEMA_PREFIX}${typename}`,
      label: shortTypename(typename),
      children: nodes.map((node) => ({
        id: node.id,
        label: labelOf(node),
        // Preserve the ECHO object on the leaf so layouts can fire hover/inspect callbacks with it.
        data: node.data?.object,
      })),
    })),
  };

  // Filter edges to those that connect two distinct leaf objects in the hierarchy.
  const objectIds = new Set(objectNodes.map((n) => n.id));
  const edges: BundleEdge[] = graph.edges
    .filter((edge: SpaceGraphEdge) => objectIds.has(edge.source) && objectIds.has(edge.target))
    .filter((edge: SpaceGraphEdge) => edge.source !== edge.target)
    .map((edge: SpaceGraphEdge) => ({
      source: edge.source,
      target: edge.target,
      kind: edge.type,
    }));

  return { tree, edges };
};

/** Drop the package prefix (`org.dxos.type.foo` → `Foo`) for display. */
const shortTypename = (typename: string): string => {
  const last = typename.split('.').pop() ?? typename;
  return last.charAt(0).toUpperCase() + last.slice(1);
};
