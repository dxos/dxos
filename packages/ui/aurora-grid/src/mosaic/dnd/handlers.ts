//
// Copyright 2023 DXOS.org
//

import { DragEndEvent } from '@dnd-kit/core';
import { getIndexBelow, getIndexBetween } from '@tldraw/indices';
import { useCallback } from 'react';

import { useMosaic } from '../mosaic';
import { Tile } from '../types';
import { useDnd } from './DndContext';

export const useHandleRearrange = (subtileIds: Set<string>, subtiles: Tile[]) => {
  const { items, relations } = useMosaic();
  const dnd = useDnd();
  return useCallback(
    ({ active, over }: DragEndEvent) => {
      if (
        active &&
        over &&
        active.id !== over.id &&
        over.data.current &&
        active.data.current &&
        subtileIds.has(active.id.toString()) &&
        subtileIds.has(over.id.toString())
      ) {
        dnd.overlayDropAnimation = 'around';
        const overOrderIndex = subtiles.findIndex(({ id }) => id === over.id);
        const activeOrderIndex = subtiles.findIndex(({ id }) => id === active.id);
        const nextIndex =
          overOrderIndex < 1
            ? getIndexBelow(subtiles[overOrderIndex].index)
            : activeOrderIndex < overOrderIndex
            ? getIndexBetween(subtiles[overOrderIndex].index, subtiles[overOrderIndex + 1]?.index)
            : getIndexBetween(subtiles[overOrderIndex - 1].index, subtiles[overOrderIndex].index);
        items[active.id].index = nextIndex;
        return nextIndex;
      } else {
        return null;
      }
    },
    [items, relations, dnd, subtileIds, subtiles],
  );
};
