//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Obj } from '@dxos/echo';

import { type MosaicTileData } from '../components';

export type UseVisibleItemsProps<T extends Obj.Any> = {
  /** Container id. */
  id: string;
  /** Current items. */
  items: T[];
  /** Currently dragging item. */
  dragging: MosaicTileData | undefined;
};

/**
 * Returns items with the dragging item removed.
 */
export const useVisibleItems = <T extends Obj.Any>({ id, items, dragging }: UseVisibleItemsProps<T>): T[] => {
  return useMemo(() => {
    if (!dragging || id !== dragging.containerId) {
      return items;
    }

    const idx = items.findIndex((item) => item.id === dragging.object.id);
    const newItems = items.slice();
    newItems.splice(idx, 1);
    return newItems;
  }, [id, items, dragging]);
};
