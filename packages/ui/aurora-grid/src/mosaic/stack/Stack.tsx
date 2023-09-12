//
// Copyright 2023 DXOS.org
//
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getIndexBelow, getIndexBetween, sortByIndex } from '@tldraw/indices';
import React from 'react';

import { useDnd, useDragEnd } from '../dnd';
import { useMosaic } from '../mosaic';
import { Tile } from '../tile';
import { TileProps } from '../types';

const Stack = ({ tile: { id, sortable } }: TileProps) => {
  const dnd = useDnd();
  const { items, relations } = useMosaic();
  const subtiles = Array.from(relations[id]?.child ?? [])
    .map((id) => items[id])
    .sort(sortByIndex);

  console.log(
    '[subtiles]',
    subtiles.map(({ index }) => index),
  );

  useDragEnd(
    ({ active, over }) => {
      if (
        active &&
        over &&
        active.id !== over.id &&
        over.data.current &&
        active.data.current &&
        relations[id]?.child?.has(active.id.toString()) &&
        relations[id]?.child?.has(over.id.toString())
      ) {
        dnd.overlayDropAnimation = 'around';
        const overOrderIndex = subtiles.findIndex(({ id }) => id === over.id);
        const activeOrderIndex = subtiles.findIndex(({ id }) => id === active.id);
        items[active.id].index =
          overOrderIndex < 1
            ? getIndexBelow(subtiles[overOrderIndex].index)
            : activeOrderIndex < overOrderIndex
            ? getIndexBetween(subtiles[overOrderIndex].index, subtiles[overOrderIndex + 1].index)
            : getIndexBetween(subtiles[overOrderIndex - 1].index, subtiles[overOrderIndex].index);
      }
    },
    [items, relations, subtiles, id],
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
