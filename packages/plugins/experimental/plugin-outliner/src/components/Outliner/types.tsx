//
// Copyright 2023 DXOS.org
//

import { RefArray } from '@dxos/live-object';

import { type TreeItemType } from '../../types';

// TODO(burdon): Re-use Tree lib? Integrate with ECHO (e.g., https://d3js.org/d3-hierarchy/hierarchy)

export const getParent = (root: TreeItemType, item: TreeItemType): TreeItemType | undefined => {
  for (const child of root.items ?? []) {
    if (!child.target) {
      continue;
    }

    if (child.target.id === item.id) {
      return root;
    }

    if (child.target.items) {
      const parent = getParent(child.target, item);
      if (parent) {
        return parent;
      }
    }
  }
};

export const getLastDescendent = (item: TreeItemType): TreeItemType => {
  const last = item.items?.length ? item.items[item.items.length - 1] : undefined;
  if (last?.target) {
    return getLastDescendent(last.target);
  }

  return item;
};

export const getPrevious = (root: TreeItemType, item: TreeItemType): TreeItemType | undefined => {
  const parent = getParent(root, item)!;
  const idx = RefArray.allResolvedTargets(parent.items).findIndex(({ id }) => id === item.id);
  if (idx > 0) {
    const previous = parent.items[idx - 1];
    if (previous?.target?.items.length) {
      return getLastDescendent(previous.target);
    }

    return previous.target;
  } else {
    return parent;
  }
};

export const getNext = (root: TreeItemType, item: TreeItemType, descend = true): TreeItemType | undefined => {
  if (item.items?.length && descend) {
    // Go to first child.
    return item.items[0].target;
  } else {
    const parent = getParent(root, item);
    if (parent) {
      const idx = RefArray.allResolvedTargets(parent.items).findIndex(({ id }) => id === item.id);
      if (idx < parent.items!.length - 1) {
        return parent.items![idx + 1].target;
      } else {
        // Get parent's next sibling.
        return getNext(root, parent, false);
      }
    }
  }
};

export const getItems = (item: TreeItemType): Array<TreeItemType | undefined> => {
  if (!item.items) {
    item.items = [];
  }

  return item.items.map((ref) => ref.target);
};
