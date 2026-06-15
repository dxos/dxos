//
// Copyright 2026 DXOS.org
//

import { type HierarchyNode, hierarchy as d3Hierarchy } from 'd3';

import { type TreeNode } from '../types';

/**
 * Build a d3 hierarchy from a TreeNode, pruning children of nodes whose ids are in `collapsed`.
 * Nodes that have children but are collapsed retain their identity in the hierarchy and can be
 * distinguished by `node._children` (the original list).
 */
export const buildHierarchy = (data: TreeNode, collapsed: Set<string> = new Set()): HierarchyNode<TreeNode> => {
  return d3Hierarchy<TreeNode>(data, (d) => {
    if (!d.children?.length) {
      return undefined;
    }
    return collapsed.has(d.id) ? undefined : d.children;
  });
};

/**
 * True when the node has children that have been hidden via collapse.
 */
export const isCollapsed = (data: TreeNode, collapsed: Set<string>): boolean =>
  Boolean(data.children?.length) && collapsed.has(data.id);

/**
 * True when the node has no children at all (a real leaf, not a collapsed branch).
 */
export const isLeaf = (data: TreeNode): boolean => !data.children?.length;
