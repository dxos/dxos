//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type TreeNodeType } from './types';

// TODO(burdon): Re-use Tree lib? Integrate with ECHO (e.g., https://d3js.org/d3-hierarchy/hierarchy)
// TODO(burdon): Is this the right datastructure? Refs vs nodes? Extensibility? Ref counting? Common with graph?

/**
 * Recursively traverse the tree from the root to the given node and return the parent.
 */
// TODO(burdon): Expensive: consider 2-way binding; or pass getParent through render stack.
export const getParent = (root: TreeNodeType, node: TreeNodeType): TreeNodeType | undefined => {
  for (const child of root.children ?? []) {
    if (child.id === node.id) {
      return root;
    }

    if (child.children) {
      const parent = getParent(child, node);
      if (parent) {
        return parent;
      }
    }
  }
};

export const getLastDescendent = (node: TreeNodeType): TreeNodeType => {
  const last = node.children?.length ? node.children[node.children.length - 1] : undefined;
  if (last) {
    return getLastDescendent(last);
  }

  return node;
};

export const getPrevious = (root: TreeNodeType, node: TreeNodeType): TreeNodeType | undefined => {
  const parent = getParent(root, node)!;
  const idx = getChildNodes(parent).findIndex(({ id }) => id === node.id);
  if (idx > 0) {
    invariant(parent.children);
    const previous = parent.children[idx - 1];
    if (previous?.children?.length) {
      return getLastDescendent(previous);
    }

    return previous;
  } else {
    return parent;
  }
};

export const getNext = (root: TreeNodeType, node: TreeNodeType, descend = true): TreeNodeType | undefined => {
  if (node.children?.length && descend) {
    // Go to first child.
    return node.children[0];
  } else {
    const parent = getParent(root, node);
    if (parent) {
      const idx = getChildNodes(parent).findIndex(({ id }) => id === node.id);
      if (idx < parent.children!.length - 1) {
        return parent.children![idx + 1];
      } else {
        // Get parent's next sibling.
        return getNext(root, parent, false);
      }
    }
  }
};

export const getChildNodes = (node: TreeNodeType): Array<TreeNodeType> => node.children;

// TODO(burdon): Check cycles.
export const tranverse = (node: TreeNodeType, callback: (node: TreeNodeType, depth: number) => void, depth = 0) => {
  callback(node, depth);
  for (const child of node.children) {
    if (child) {
      tranverse(child, callback, depth + 1);
    }
  }
};

/**
 * Indent the node at the given index.
 * @returns The node that was indented or null if the node was already at the maximum indent.
 */
export const indent = (parent: TreeNodeType, index: number): TreeNodeType | null => {
  if (index < 1 || index >= parent.children.length) {
    return null;
  }

  const previous = parent.children[index - 1];
  invariant(previous);
  const node = parent.children[index];
  invariant(node);

  parent.children.splice(index, 1);
  previous.children.push(node);

  return node;
};

export const unindent = (root: TreeNodeType, parent: TreeNodeType, index: number): TreeNodeType | null => {
  const ancestor = getParent(root, parent);
  if (!ancestor) {
    return null;
  }

  const nodes = getChildNodes(parent);
  const [node, ...rest] = nodes.splice(index, parent.children.length - index);
  parent.children.splice(index, parent.children.length - index);

  // Add to ancestor.
  const idx = getChildNodes(ancestor).findIndex((n) => n.id === parent.id);
  ancestor.children.splice(idx + 1, 0, node);

  // Transplant following siblings to current node.
  node.children.push(...rest);

  return node;
};
