//
// Copyright 2023 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { useMosaic } from './useMosaic';
import { type MosaicCompareDataItem } from '../Container';
import { type MosaicDataItem } from '../types';
import { Path } from '../util';

const isEquivalent = <T extends MosaicDataItem>(itemsA: T[], itemsB: T[]): boolean => {
  if (itemsA.length !== itemsB.length) {
    return false;
  } else {
    return itemsA.every(({ id }, index) => id === itemsB[index].id);
  }
};

/**
 * Returns a spliced collection of items including a placeholder if items that could drop,
 * and removing any item that is currently being dragged out.
 */
export const useItemsWithPreview = <T extends MosaicDataItem>({
  path,
  items,
  strategy = 'default',
  compare,
}: {
  path: string;
  items: T[];
  strategy?: 'default' | 'layout-stable';
  compare?: MosaicCompareDataItem;
}): T[] => {
  const { operation, activeItem, overItem } = useMosaic();
  const [itemsWithPreview, setItemsWithPreview] = useState(items);
  const sortedItems = useMemo(() => {
    return compare ? [...items].sort(compare) : items;
  }, [items, compare]);
  const overParent =
    // If over the sortable context itself & active item is foreign, then treat self as the parent.
    // This allows items to be appended to the end of the sortable.
    overItem?.path === path && activeItem && Path.parent(activeItem.path) !== overItem.path
      ? path
      : overItem && Path.parent(overItem.path);
  const [lastOverParent, setLastOverParent] = useState(overParent);

  useEffect(() => {
    if (!activeItem || !overItem) {
      setLastOverParent(undefined);
      setItemsWithPreview(sortedItems);
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
        if (activeIsChild && !overIsChild && operation !== 'rearrange') {
          // Change the dnd-id of the origin item that may move to a foreign destination
          setItemsWithPreview(
            sortedItems.map((item) => {
              if (item.id === activeItem.item.id) {
                return { ...item, id: `${item.id}--origin` };
              } else {
                return item;
              }
            }),
          );
        } else {
          // Reset items.
          setItemsWithPreview(sortedItems);
        }
        break;
      case 'default':
      default:
        if (!activeIsChild && overIsChild) {
          // Insert item into sortable.
          const position = overItem.position as number;
          setItemsWithPreview([
            ...sortedItems.slice(0, position),
            activeItem.item as T,
            ...sortedItems.slice(position),
          ]);
        } else if (!activeIsChild && overSelf) {
          // Append item to end of sortable.
          setItemsWithPreview([...sortedItems, activeItem.item as T]);
        } else if (activeIsChild && !overIsChild) {
          // Remove item being dragged out.
          setItemsWithPreview(sortedItems.filter((item) => item.id !== activeItem.item.id));
        } else {
          // Reset items.
          setItemsWithPreview(sortedItems);
        }
        break;
    }
  }, [operation, activeItem, overItem, overParent, lastOverParent, compare, path, items]);

  // In order to avoid render glitching, rather than waiting for the effect to run,
  // immediately return the new items after dropping an item into a new path.
  return isEquivalent(sortedItems, itemsWithPreview) ? sortedItems : itemsWithPreview;
};
