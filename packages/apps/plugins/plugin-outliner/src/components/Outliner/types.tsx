//
// Copyright 2023 DXOS.org
//

import { type TextObject } from '@dxos/client/echo';

export type Item = {
  id: string;
  done?: boolean;
  text?: TextObject;
  items?: Item[];
};

// TODO(burdon): Re-use Tree lib? Integrate with ECHO (e.g., https://d3js.org/d3-hierarchy/hierarchy)

export const getParent = (root: Item, item: Item): Item | undefined => {
  for (const child of root.items ?? []) {
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

export const getLastDescendent = (item: Item): Item => {
  if (item.items?.length) {
    const last = item.items[item.items.length - 1];
    return getLastDescendent(last);
  }

  return item;
};

export const getPrevious = (root: Item, item: Item): Item | undefined => {
  const parent = getParent(root, item)!;
  const idx = parent.items!.findIndex(({ id }) => id === item.id);
  if (idx > 0) {
    const previous = parent.items![idx - 1];
    if (previous.items?.length) {
      return getLastDescendent(previous);
    }

    return previous;
  } else {
    return parent;
  }
};

export const getNext = (root: Item, item: Item, descend = true): Item | undefined => {
  if (item.items?.length && descend) {
    // Go to first child.
    return item.items[0];
  } else {
    const parent = getParent(root, item);
    if (parent) {
      const idx = parent.items!.findIndex(({ id }) => id === item.id);
      if (idx < parent.items!.length - 1) {
        return parent.items![idx + 1];
      } else {
        // Get parent's next sibling.
        return getNext(root, parent, false);
      }
    }
  }
};

export const getItems = (item: Item): Item[] => {
  return (item.items ??= []);
};
