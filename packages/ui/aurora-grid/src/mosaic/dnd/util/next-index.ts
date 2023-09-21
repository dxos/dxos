//
// Copyright 2023 DXOS.org
//

import { UniqueIdentifier } from '@dnd-kit/core';
import { getIndexAbove, getIndexBelow, getIndexBetween } from '@tldraw/indices';

import { Tile } from '../../types';

export const nextRearrangeIndex = (subtiles: Tile[], activeId: UniqueIdentifier, overId?: UniqueIdentifier) => {
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

export const nextCopyIndex = (subtiles: Tile[], overId?: UniqueIdentifier) => {
  const overOrderIndex = subtiles.length > 0 ? subtiles.findIndex(({ id }) => id === overId) : -1;
  const previewOrderIndex = subtiles.findIndex(({ id }) => id.startsWith('preview--'));
  if (overOrderIndex >= 0) {
    return overOrderIndex < 1
      ? getIndexBelow(subtiles[overOrderIndex].index)
      : previewOrderIndex < overOrderIndex && previewOrderIndex >= 0
      ? getIndexBetween(subtiles[overOrderIndex].index, subtiles[overOrderIndex + 1]?.index)
      : getIndexBetween(subtiles[overOrderIndex - 1].index, subtiles[overOrderIndex]?.index);
  } else {
    return subtiles.length ? getIndexAbove(subtiles[subtiles.length - 1].index) : 'a0';
  }
};
