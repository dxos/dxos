//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Obj } from '@dxos/echo';

import { type MosaicTileData } from '../components';

/**
 * Returns items with the dragging item removed.
 */
export const useVisibleItems = <T extends Obj.Any>(items: T[], dragging: MosaicTileData | undefined): T[] => {
  return useMemo(() => {
    if (!dragging) {
      return items;
    }

    const idx = items.findIndex((item) => item.id === dragging.object.id);
    const newItems = items.slice();
    newItems.splice(idx, 1);
    return newItems;
  }, [items, dragging]);
};
