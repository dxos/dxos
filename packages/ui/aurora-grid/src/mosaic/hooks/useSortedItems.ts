//
// Copyright 2023 DXOS.org
//

import { useMosaic } from './useMosaic';
import { MosaicDataItem } from '../types';

/**
 * Returns a spliced collection of items including a placeholder if items that could drop,
 * and removing any item that is currently being dragged out.
 */
export const useSortedItems = <T extends MosaicDataItem>({
  container,
  items,
}: {
  container: string;
  items: T[];
}): T[] => {
  const { activeItem, overItem } = useMosaic();

  // Insert item being dragged in.
  if (
    activeItem &&
    activeItem.item.id !== container &&
    activeItem.container !== container &&
    overItem?.container === container
  ) {
    const sortedItems = [...items];
    sortedItems.splice(overItem.position as number, 0, activeItem.item as T);
    return sortedItems;
  }

  // Remove item being dragged out.
  if (activeItem && activeItem.container === container && overItem?.container !== activeItem.container) {
    return items.filter((item) => item.id !== activeItem.item.id);
  }

  return items;
};
