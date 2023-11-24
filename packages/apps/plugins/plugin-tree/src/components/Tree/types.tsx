//
// Copyright 2023 DXOS.org
//

export type Item = {
  id: string;
  done?: boolean;
  text?: string; // TODO(burdon): Change to TextObject.
  items?: Item[];
};

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

export const getLast = (root: Item): Item => {
  const last = root.items![root.items!.length - 1];
  if (last.items?.length) {
    return getLast(last);
  }

  return last;
};

export const getPrevious = (root: Item, item: Item): Item | undefined => {
  const parent = getParent(root, item)!;
  const idx = parent.items!.findIndex(({ id }) => id === item.id);
  if (idx > 0) {
    const previous = parent.items![idx - 1];
    if (previous.items?.length) {
      return getLast(previous);
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
