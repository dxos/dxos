//
// Copyright 2023 DXOS.org
//

import { type DragEndEvent } from '@dnd-kit/core';
import { useCallback } from 'react';

import { useMosaic } from './useMosaic';
import { useMosaicDnd } from '../../dnd';
import { getSubtiles, nextRearrangeIndex } from '../util';

export const useHandleRearrangeDragEnd = () => {
  const {
    mosaic: { tiles, relations },
    onMosaicChange,
  } = useMosaic();
  const dnd = useMosaicDnd();
  return useCallback(
    ({ active, over }: DragEndEvent) => {
      if (active && over) {
        const parentIds = Array.from(relations[active.id]?.parent ?? []);
        const parentIsSortable = tiles[parentIds[0]]?.sortable;
        if (parentIsSortable) {
          dnd.overlayDropAnimation = 'around';
          if (active.id === over.id) {
            return tiles[active.id].index;
          } else {
            const subtiles = getSubtiles(relations[Array.from(parentIds)[0]]?.child ?? new Set(), tiles);
            if (subtiles.length) {
              const index = nextRearrangeIndex(subtiles, active.id, over.id);
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
          }
        } else {
          return null;
        }
      } else {
        return null;
      }
    },
    [tiles, relations, onMosaicChange, dnd],
  );
};
