//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { makeRef, RefArray } from '@dxos/live-object';

import { type TreeNodeType } from './types';

// TODO(burdon): Re-use Tree lib? Integrate with ECHO (e.g., https://d3js.org/d3-hierarchy/hierarchy)
// TODO(burdon): Is this the right datastructure? Refs vs nodes? Extensibility? Ref counting? Common with graph?

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

// TODO(burdon): Check cycles.
export const tranverse = (node: TreeNodeType, callback: (node: TreeNodeType, depth: number) => void, depth = 0) => {
  callback(node, depth);
  for (const child of node.children) {
    if (child.target) {
      tranverse(child.target, callback, depth + 1);
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
  invariant(previous.target);
  const node = parent.children[index];
  invariant(node.target);

  parent.children.splice(index, 1);
  previous.target.children.push(node);

  return node.target;
};

export const unindent = (root: TreeNodeType, parent: TreeNodeType, index: number): TreeNodeType | null => {
  const ancestor = getParent(root, parent);
  if (!ancestor) {
    return null;
  }

  // TODO(burdon): Splice doesn't return well-formed refs?
  // const [node, ...rest] = parent.children.splice(index, parent.children.length - index);
  // invariant(node.target); // FAIL.
  // When splicing refs:
  // index.tsx:86 Ref
  // └─ Predicate refinement failure
  //    └─ Expected Ref, actual {"/":"dxn:echo:@:01JQKKD5P59XCSQJMJ62CNY4HE"} ParseError: Ref
  // └─ Predicate refinement failure
  //    └─ Expected Ref, actual {"/":"dxn:echo:@:01JQKKD5P59XCSQJMJ62CNY4HE"}
  //     at parseError (ParseResult.ts:266:62)

  const nodes = getChildNodes(parent);
  const [node, ...rest] = nodes.splice(index, parent.children.length - index);
  parent.children.splice(index, parent.children.length - index);

  // Add to ancestor.
  const idx = getChildNodes(ancestor).findIndex((n) => n.id === parent.id);
  ancestor.children.splice(idx + 1, 0, makeRef(node));

  // Transplant following siblings to current node.
  node.children.push(...rest.map(makeRef));

  return node;
};
