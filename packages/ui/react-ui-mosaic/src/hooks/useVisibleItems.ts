//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type GetId, type MosaicTileData } from '../components';

export type UseVisibleItemsProps<TItem = any> = {
  /** Container id. */
  id: string;

  /** Current items. */
  items?: readonly TItem[] | TItem[];

  /** Currently dragging item. */
  dragging: MosaicTileData<TItem> | undefined;

  /** ID getter */
  getId: GetId<TItem>;
};

/**
 * Returns items with the dragging item removed.
 */
export const useVisibleItems = <TItem = any>({
  id,
  items,
  dragging,
  getId,
}: UseVisibleItemsProps<TItem>): readonly TItem[] | TItem[] => {
  const visibleItems = useMemo(() => {
    if (!items || !dragging || id !== dragging.containerId) {
      return items ?? [];
    }

    const idx = items.findIndex((item) => getId(item) === dragging.id);
    if (idx === -1) {
      return items;
    }

    const visibleItems = items.slice();
    visibleItems.splice(idx, 1);
    return visibleItems;
  }, [id, items, dragging, getId]);

  return visibleItems;
};
