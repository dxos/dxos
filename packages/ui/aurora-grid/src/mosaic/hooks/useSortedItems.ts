//
// Copyright 2023 DXOS.org
//

import { useMosaic } from './useMosaic';
import { MosaicDataItem } from '../types';

/**
 * Returns a spliced collection of items including a placeholder if items that could drop,
 * and removing any item that is currently being dragged out.
 */
export const useSortedItems = <T extends MosaicDataItem>({ path, items }: { path: string; items: T[] }): T[] => {
  const { activeItem, overItem } = useMosaic();

  // Insert placeholder item being dragged in.
  // TODO(burdon): This currently isn't animated (e.g., dragging into new kanban column vs. same column).
  if (activeItem && activeItem.item.id !== path && activeItem.path !== path && overItem && overItem.path === path) {
    const sortedItems = [...items];
    const position = (overItem.position as number) ?? sortedItems.length;
    sortedItems.splice(position, 0, activeItem.item as T);
    return sortedItems;
  }

  // Remove item being dragged out.
  if (activeItem && activeItem.path === path && overItem && overItem.path !== activeItem.path) {
    return items.filter((item) => item.id !== activeItem.item.id);
  }

  return items;
};
