//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { RefArray } from '@dxos/live-object';

import { type TreeNodeType } from './tree';

// TODO(burdon): Re-use Tree lib? Integrate with ECHO (e.g., https://d3js.org/d3-hierarchy/hierarchy)

/**
 * Recursively traverse the tree from the root to the given node and return the parent.
 */
// TODO(burdon): Expensive: consider 2-way binding; or pass getParent through render stack.
export const getParent = (root: TreeNodeType, node: TreeNodeType): TreeNodeType | undefined => {
  for (const child of root.children ?? []) {
    if (!child.target) {
      continue;
    }

    if (child.target.id === node.id) {
      return root;
    }

    if (child.target.children) {
      const parent = getParent(child.target, node);
      if (parent) {
        return parent;
      }
    }
  }
};

export const getLastDescendent = (node: TreeNodeType): TreeNodeType => {
  const last = node.children?.length ? node.children[node.children.length - 1] : undefined;
  if (last?.target) {
    return getLastDescendent(last.target);
  }

  return node;
};

export const getPrevious = (root: TreeNodeType, node: TreeNodeType): TreeNodeType | undefined => {
  const parent = getParent(root, node)!;
  const idx = getChildNodes(parent).findIndex(({ id }) => id === node.id);
  if (idx > 0) {
    invariant(parent.children);
    const previous = parent.children[idx - 1];
    if (previous?.target?.children?.length) {
      return getLastDescendent(previous.target);
    }

    return previous.target;
  } else {
    return parent;
  }
};

export const getNext = (root: TreeNodeType, node: TreeNodeType, descend = true): TreeNodeType | undefined => {
  if (node.children?.length && descend) {
    // Go to first child.
    return node.children[0].target;
  } else {
    const parent = getParent(root, node);
    if (parent) {
      const idx = getChildNodes(parent).findIndex(({ id }) => id === node.id);
      if (idx < parent.children!.length - 1) {
        return parent.children![idx + 1].target;
      } else {
        // Get parent's next sibling.
        return getNext(root, parent, false);
      }
    }
  }
};

export const getChildNodes = (node: TreeNodeType): Array<TreeNodeType> => RefArray.allResolvedTargets(node.children);
