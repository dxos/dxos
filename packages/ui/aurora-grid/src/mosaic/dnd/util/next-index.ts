//
// Copyright 2023 DXOS.org
//

import { UniqueIdentifier } from '@dnd-kit/core';
import { getIndexBelow, getIndexBetween } from '@tldraw/indices';

import { Tile } from '../../types';

export const nextIndex = (subtiles: Tile[], activeId: UniqueIdentifier, overId?: UniqueIdentifier) => {
  console.log('[next index]', subtiles, activeId, overId);
  const overOrderIndex = subtiles.length > 0 ? subtiles.findIndex(({ id }) => id === overId) : -1;
  if (overOrderIndex >= 0) {
    const activeOrderIndex = subtiles.findIndex(({ id }) => id === activeId);
    return overOrderIndex < 1
      ? getIndexBelow(subtiles[overOrderIndex].index)
      : activeOrderIndex < overOrderIndex
      ? getIndexBetween(subtiles[overOrderIndex].index, subtiles[overOrderIndex + 1]?.index)
      : getIndexBetween(subtiles[overOrderIndex - 1].index, subtiles[overOrderIndex].index);
  } else {
    return null;
  }
};
