//
// Copyright 2023 DXOS.org
//

import { useMosaic } from './useMosaic';
import { type MosaicDataItem } from '../types';
import { Path } from '../util';

// TODO(thure): I know the signature of this
//  is not an expando like its sibling’s,
//  but I no longer trust objects.

export const useItemsWithOrigin = <T extends MosaicDataItem>(path: string, items: T[]) => {
  const { operation, activeItem, overItem } = useMosaic();

  if (!activeItem || !overItem) {
    return items;
  }

  const activeIsChild = Path.hasChild(path, activeItem.path);
  const overIsChild = Path.hasChild(path, overItem.path);

  if (activeIsChild && !overIsChild && operation !== 'rearrange') {
    // Change the dnd-id of the origin item that may move to a foreign destination
    return items.map((item) => {
      if (item.id === activeItem.item.id) {
        return { ...item, id: `${item.id}--origin` };
      } else {
        return item;
      }
    });
  } else {
    // Reset items.
    return items;
  }
};
