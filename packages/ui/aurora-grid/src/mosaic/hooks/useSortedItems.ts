//
// Copyright 2023 DXOS.org
//

import { useMosaic } from './useMosaic';
import { MosaicDataItem } from '../types';
import { Path } from '../util';

/**
 * Returns a spliced collection of items including a placeholder if items that could drop,
 * and removing any item that is currently being dragged out.
 */
export const useSortedItems = <T extends MosaicDataItem>({ path, items }: { path: string; items: T[] }): T[] => {
  const { activeItem, overItem } = useMosaic();

  // Insert placeholder item being dragged in.
  // TODO(burdon): This currently isn't animated (e.g., dragging into new kanban column vs. same column).
  if (
    // Item is being dragged
    activeItem &&
    // From a different path
    !Path.hasChild(path, activeItem.path) &&
    // Over an item
    overItem &&
    // Which is this item (but only if it's not a sibling of the active item which indicates a reorder)
    ((path === overItem.path && Path.parent(activeItem.path) !== Path.parent(overItem.path)) ||
      // Or which is a child of this item
      Path.hasChild(path, overItem.path))
  ) {
    const sortedItems = [...items];
    const position = path === overItem.path ? sortedItems.length : (overItem.position as number);
    sortedItems.splice(position, 0, activeItem.item as T);
    return sortedItems;
  }

  // Remove item being dragged out.
  if (activeItem && Path.hasChild(path, activeItem.path) && overItem && !Path.hasChild(path, overItem.path)) {
    return items.filter((item) => item.id !== activeItem.item.id);
  }

  return items;
};
