//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { useMosaic } from './useMosaic';
import { type MosaicDataItem } from '../types';
import { Path } from '../util';

/**
 * Returns a spliced collection of items including a placeholder if items that could drop,
 * and removing any item that is currently being dragged out.
 */
export const useItemsWithPreview = <T extends MosaicDataItem>({ path, items }: { path: string; items: T[] }): T[] => {
  const { operation, activeItem, overItem } = useMosaic();
  const [itemsWithPreview, setItemsWithPreview] = useState(items);
  const overParent =
    // If over the sortable context itself & active item is foreign, then treat self as the parent.
    // This allows items to be appended to the end of the sortable.
    overItem?.path === path && activeItem && Path.parent(activeItem.path) !== overItem.path
      ? path
      : overItem && Path.parent(overItem.path);
  const [lastOverParent, setLastOverParent] = useState(overParent);

  useEffect(() => {
    if (operation === 'reject' || !activeItem || !overItem) {
      setLastOverParent(undefined);
      setItemsWithPreview(items);
      return;
    }

    if (lastOverParent === overParent) {
      return;
    }

    setLastOverParent(overParent);

    const activeIsChild = Path.hasChild(path, activeItem.path);
    const overIsChild = Path.hasChild(path, overItem.path);
    const overSelf = overItem.path === path;

    if (!activeIsChild && overIsChild) {
      // Insert item into sortable.
      setItemsWithPreview((items) => {
        const position = overItem.position as number;
        return [...items.slice(0, position), activeItem.item as T, ...items.slice(position)];
      });
    } else if (!activeIsChild && overSelf) {
      // Append item to end of sortable.
      setItemsWithPreview((items) => [...items, activeItem.item as T]);
    } else if (activeIsChild && !overIsChild) {
      // Remove item being dragged out.
      setItemsWithPreview((items) => items.filter((item) => item.id !== activeItem.item.id));
    } else {
      // Reset items.
      setItemsWithPreview(items);
    }
  }, [operation, activeItem, overItem, overParent, lastOverParent, path, items]);

  // In order to avoid render glitching, rather than waiting for the effect to run,
  // immediately return the new items after dropping an item into a new path.
  return items.length === itemsWithPreview.length ? items : itemsWithPreview;
};
