//
// Copyright 2023 DXOS.org
//

import { type Key } from '@dxos/echo';
import { type TreeNode } from '@dxos/react-ui-graph';

import { type TreeType } from './tree';

/**
 * Convert an ECHO `TreeType` (id-keyed node map) into a nested `TreeNode` hierarchy.
 * Returns `undefined` if the root id is missing — the tree is then incomplete and shouldn't render.
 */
export const treeTypeToTreeNode = (
  tree: TreeType,
  rootId: Key.EntityId = tree.root,
  visited: Set<string> = new Set(),
): TreeNode | undefined => {
  const node = tree.nodes[rootId];
  if (!node) {
    return undefined;
  }
  if (visited.has(rootId)) {
    return { id: rootId, label: labelOf(node), data: node.data };
  }
  visited.add(rootId);

  return {
    id: rootId,
    label: labelOf(node),
    data: node.data,
    children: node.children
      .map((childId) => treeTypeToTreeNode(tree, childId, visited))
      .filter((c): c is TreeNode => Boolean(c)),
  };
};

const labelOf = (node: { data: Record<string, any> }): string | undefined => {
  return typeof node.data?.text === 'string' ? node.data.text : undefined;
};
