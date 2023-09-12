//
// Copyright 2023 DXOS.org
//
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { sortByIndex } from '@tldraw/indices';
import React, { useEffect } from 'react';

import { useDragEnd } from '../dnd';
import { useHandleRearrange } from '../dnd/handlers';
import { useMosaic } from '../mosaic';
import { Tile } from '../tile';
import { TileProps } from '../types';

const Stack = ({ tile: { id, sortable } }: TileProps) => {
  const { items, relations } = useMosaic();
  const subtileIds = relations[id]?.child ?? new Set();
  const subtiles = Array.from(subtileIds)
    .map((id) => items[id])
    .sort(sortByIndex);

  const handleRearrange = useHandleRearrange(subtileIds, subtiles);

  useEffect(() => {
    console.log('[stack]', 'mosaic.items update');
  }, [items]);

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
    <SortableContext items={subtiles} strategy={verticalListSortingStrategy}>
      {subtiles.map((tile) => (
        <Tile tile={tile} key={tile.id} draggable={sortable} />
      ))}
    </SortableContext>
  );
};

export { Stack };
