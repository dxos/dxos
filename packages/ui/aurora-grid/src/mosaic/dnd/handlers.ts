//
// Copyright 2023 DXOS.org
//

import { DragEndEvent } from '@dnd-kit/core';
import { getIndexBelow, getIndexBetween, sortByIndex } from '@tldraw/indices';
import { useCallback } from 'react';

import { useDnd } from './DndContext';
import { useDragEnd } from './hooks';
import { useMosaic } from '../mosaic';

export const useHandleRearrange = () => {
  const {
    mosaic: { tiles, relations },
    onMosaicChange,
  } = useMosaic();
  const dnd = useDnd();
  const deps = [tiles, relations, onMosaicChange, dnd];
  const handleRearrange = useCallback(({ active, over }: DragEndEvent) => {
    if (active && over && active.id !== over.id) {
      const parentIds = Array.from(relations[active.id]?.parent ?? []);
      const parentIsSortable = tiles[parentIds[0]]?.sortable;
      if (parentIsSortable) {
        const subtileIds: Set<string> = relations[Array.from(parentIds)[0]]?.child ?? new Set();
        const subtiles = Array.from(subtileIds)
          .map((id) => tiles[id])
          .sort(sortByIndex);
        if (subtiles.length) {
          dnd.overlayDropAnimation = 'around';
          const overOrderIndex = subtiles.findIndex(({ id }) => id === over.id);
          const activeOrderIndex = subtiles.findIndex(({ id }) => id === active.id);
          const nextIndex =
            overOrderIndex < 1
              ? getIndexBelow(subtiles[overOrderIndex].index)
              : activeOrderIndex < overOrderIndex
              ? getIndexBetween(subtiles[overOrderIndex].index, subtiles[overOrderIndex + 1]?.index)
              : getIndexBetween(subtiles[overOrderIndex - 1].index, subtiles[overOrderIndex].index);
          tiles[active.id].index = nextIndex;
          onMosaicChange?.({ type: 'rearrange', id: active.id.toString(), index: nextIndex });
          return nextIndex;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  }, deps);
  useDragEnd(handleRearrange, deps);
};
