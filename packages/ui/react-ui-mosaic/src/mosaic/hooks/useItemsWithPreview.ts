//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { useContainer } from './useContainer';
import { useMosaic } from './useMosaic';
import { type MosaicDataItem } from '../types';
import { Path } from '../util';

/**
 * Returns a spliced collection of items including a placeholder if items that could drop,
 * and removing any item that is currently being dragged out.
 */
export const useItemsWithPreview = <T extends MosaicDataItem>({
  path,
  items,
  strategy = 'default',
}: {
  path: string;
  items: T[];
  strategy?: 'default' | 'layout-stable';
}): T[] => {
  const { operation, activeItem, overItem } = useMosaic();
  const [itemsWithPreview, setItemsWithPreview] = useState(items);
  const { compare } = useContainer();
  const overParent =
    // If over the sortable context itself & active item is foreign, then treat self as the parent.
    // This allows items to be appended to the end of the sortable.
    overItem?.path === path && activeItem && Path.parent(activeItem.path) !== overItem.path
      ? path
      : overItem && Path.parent(overItem.path);
  const [lastOverParent, setLastOverParent] = useState(overParent);

  useEffect(() => {
    if (operation === 'reject' || operation === 'rearrange' || !activeItem || !overItem) {
      setLastOverParent(undefined);
      setItemsWithPreview(compare ? [...items].sort(compare) : items);
      return;
    }

    if (lastOverParent === overParent) {
      return;
    }

    setLastOverParent(overParent);

    const activeIsChild = Path.hasChild(path, activeItem.path);
    const overIsChild = Path.hasChild(path, overItem.path);
    const overSelf = overItem.path === path;

    switch (strategy) {
      case 'layout-stable':
        // Reset items.
        setItemsWithPreview(compare ? [...items].sort(compare) : items);
        break;
      case 'default':
      default:
        if (!activeIsChild && overIsChild) {
          // Insert item into sortable.
          setItemsWithPreview((items) => {
            const position = overItem.position as number;
            const sortedItems = compare ? [...items].sort(compare) : items;
            return [...sortedItems.slice(0, position), activeItem.item as T, ...sortedItems.slice(position)];
          });
        } else if (!activeIsChild && overSelf) {
          // Append item to end of sortable.
          setItemsWithPreview((items) => [...(compare ? [...items].sort(compare) : items), activeItem.item as T]);
        } else if (activeIsChild && !overIsChild) {
          // Remove item being dragged out.
          setItemsWithPreview((items) =>
            (compare ? [...items].sort(compare) : items).filter((item) => item.id !== activeItem.item.id),
          );
        } else {
          // Reset items.
          setItemsWithPreview(compare ? [...items].sort(compare) : items);
        }
        break;
    }
  }, [operation, activeItem, overItem, overParent, lastOverParent, compare, path, items]);

  // In order to avoid render glitching, rather than waiting for the effect to run,
  // immediately return the new items after dropping an item into a new path.
  return items.length === itemsWithPreview.length ? items : itemsWithPreview;
};
