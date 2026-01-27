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
  items?: T[];
  /** Currently dragging item. */
  dragging: MosaicTileData | undefined;
};

/**
 * Returns items with the dragging item removed.
 */
// TODO(burdon): Check 'dragging' is stable.
// TODO(burdon): Flicker when dropping to other column (re-appears in column dragging from).
export const useVisibleItems = <T extends Obj.Any>({ id, items, dragging }: UseVisibleItemsProps<T>): T[] => {
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
  }, [id, items, items?.length, dragging]);

  console.log('useVisibleItems', id, dragging, items?.length, visibleItems.length);
  return visibleItems;
};
