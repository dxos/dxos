//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { RefArray } from '@dxos/live-object';

import { type TreeNodeType } from '../../types';

// TODO(burdon): Re-use Tree lib? Integrate with ECHO (e.g., https://d3js.org/d3-hierarchy/hierarchy)

export const getParent = (root: TreeNodeType, item: TreeNodeType): TreeNodeType | undefined => {
  for (const child of root.children ?? []) {
    if (!child.target) {
      continue;
    }

    if (child.target.id === item.id) {
      return root;
    }

    if (child.target.children) {
      const parent = getParent(child.target, item);
      if (parent) {
        return parent;
      }
    }
  }
};

export const getLastDescendent = (item: TreeNodeType): TreeNodeType => {
  const last = item.children?.length ? item.children[item.children.length - 1] : undefined;
  if (last?.target) {
    return getLastDescendent(last.target);
  }

  return item;
};

export const getPrevious = (root: TreeNodeType, item: TreeNodeType): TreeNodeType | undefined => {
  const parent = getParent(root, item)!;
  const idx = RefArray.allResolvedTargets(parent.children ?? []).findIndex(({ id }) => id === item.id);
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

export const getNext = (root: TreeNodeType, item: TreeNodeType, descend = true): TreeNodeType | undefined => {
  if (item.children?.length && descend) {
    // Go to first child.
    return item.children[0].target;
  } else {
    const parent = getParent(root, item);
    if (parent) {
      const idx = RefArray.allResolvedTargets(parent.children ?? []).findIndex(({ id }) => id === item.id);
      if (idx < parent.children!.length - 1) {
        return parent.children![idx + 1].target;
      } else {
        // Get parent's next sibling.
        return getNext(root, parent, false);
      }
    }
  }
};

export const getItems = (item: TreeNodeType): Array<TreeNodeType | undefined> => {
  if (!item.children) {
    item.children = [];
  }

  return item.children.map((ref) => ref.target);
};
