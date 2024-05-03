//
// Copyright 2023 DXOS.org
//

import { type TreeItemType } from '@braneframe/types';
import { nonNullable } from '@dxos/util';

// TODO(burdon): Re-use Tree lib? Integrate with ECHO (e.g., https://d3js.org/d3-hierarchy/hierarchy)

export const getParent = (root: TreeItemType, item: TreeItemType): TreeItemType | undefined => {
  for (const child of root.items ?? []) {
    if (!child) {
      continue;
    }

    if (child.id === item.id) {
      return root;
    }

    if (child.items) {
      const parent = getParent(child, item);
      if (parent) {
        return parent;
      }
    }
  }
};

export const getLastDescendent = (item: TreeItemType): TreeItemType => {
  const last = item.items?.length && item.items[item.items.length - 1];
  if (last) {
    return getLastDescendent(last);
  }

  return item;
};

export const getPrevious = (root: TreeItemType, item: TreeItemType): TreeItemType | undefined => {
  const parent = getParent(root, item)!;
  const idx = parent.items.filter(nonNullable).findIndex(({ id }) => id === item.id);
  if (idx > 0) {
    const previous = parent.items[idx - 1];
    if (previous?.items.length) {
      return getLastDescendent(previous);
    }

    return previous;
  } else {
    return parent;
  }
};

export const getNext = (root: TreeItemType, item: TreeItemType, descend = true): TreeItemType | undefined => {
  if (item.items?.length && descend) {
    // Go to first child.
    return item.items[0];
  } else {
    const parent = getParent(root, item);
    if (parent) {
      const idx = parent.items.filter(nonNullable).findIndex(({ id }) => id === item.id);
      if (idx < parent.items!.length - 1) {
        return parent.items![idx + 1];
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

  return item.items;
};
