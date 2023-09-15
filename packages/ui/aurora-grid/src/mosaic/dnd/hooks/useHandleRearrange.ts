//
// Copyright 2023 DXOS.org
//

import { DragEndEvent } from '@dnd-kit/core';
import { useCallback } from 'react';

import { useMosaic } from '../../mosaic';
import { getSubtiles } from '../../util';
import { useDnd } from '../DndContext';
import { nextIndex } from '../util';

export const useHandleRearrangeDragEnd = () => {
  const {
    mosaic: { tiles, relations },
    onMosaicChange,
  } = useMosaic();
  const dnd = useDnd();
  const deps = [tiles, relations, onMosaicChange, dnd];
  return useCallback(({ active, over }: DragEndEvent) => {
    if (active && over && active.id !== over.id) {
      const parentIds = Array.from(relations[active.id]?.parent ?? []);
      const parentIsSortable = tiles[parentIds[0]]?.sortable;
      if (parentIsSortable) {
        const subtiles = getSubtiles(relations[Array.from(parentIds)[0]]?.child ?? new Set(), tiles);
        if (subtiles.length) {
          dnd.overlayDropAnimation = 'around';
          const index = nextIndex(subtiles, active.id, over.id);
          if (index) {
            tiles[active.id].index = index;
            onMosaicChange?.({ type: 'rearrange', id: active.id.toString(), index });
            return index;
          } else {
            return null;
          }
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
};
