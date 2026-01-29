//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type MosaicBaseItem, type MosaicTileData } from '../components';

export type UseVisibleItemsProps<T extends MosaicBaseItem> = {
  /** Container id. */
  id: string;
  /** Current items. */
  items?: T[];
  /** Currently dragging item. */
  dragging: MosaicTileData | undefined;
};

/**
 * Returns items with the dragging item removed.
 */
export const useVisibleItems = <T extends MosaicBaseItem>({ id, items, dragging }: UseVisibleItemsProps<T>): T[] => {
  const visibleItems = useMemo(() => {
    if (!items || !dragging || id !== dragging.containerId) {
      return items ?? [];
    }

    const idx = items.findIndex((item) => item.id === dragging.object.id);
    if (idx === -1) {
      return items;
    }

    const visibleItems = items.slice();
    visibleItems.splice(idx, 1);
    return visibleItems;
  }, [id, items, dragging]);

  return visibleItems;
};
