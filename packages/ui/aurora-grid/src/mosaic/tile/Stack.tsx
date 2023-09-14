//
// Copyright 2023 DXOS.org
//
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { sortByIndex } from '@tldraw/indices';
import React, { forwardRef, useEffect } from 'react';

import { Tile } from './';
import { useDragEnd } from '../dnd';
import { useHandleRearrange } from '../dnd/handlers';
import { useMosaic, useMosaicData } from '../mosaic';
import { StackTile } from '../types';

const Stack = forwardRef<HTMLDivElement, StackTile>((tile, forwardedRef) => {
  const {
    mosaic: { tiles, relations },
    Delegator,
  } = useMosaic();
  const { [tile.id]: stackData } = useMosaicData();
  const subtileIds = relations[tile.id]?.child ?? new Set();
  const subtiles = Array.from(subtileIds)
    .map((id) => tiles[id])
    .sort(sortByIndex);

  const handleRearrange = useHandleRearrange(subtileIds, subtiles);

  useEffect(() => {
    console.log('[stack]', 'mosaic.tiles update');
  }, [tiles]);

  useEffect(() => {
    console.log('[stack]', 'mosaic.relations update');
  }, [relations]);

  useEffect(() => {
    console.log('[stack]', 'computed subtiles update');
  }, [subtiles]);

  useDragEnd(
    (event) => {
      handleRearrange(event);
    },
    [handleRearrange],
  );

  return (
    <Delegator data={stackData} tile={tile} ref={forwardedRef}>
      <SortableContext items={subtiles} strategy={verticalListSortingStrategy}>
        {subtiles.map((tile) => (
          <Tile key={tile.id} {...tile} />
        ))}
      </SortableContext>
    </Delegator>
  );
});

export { Stack };
