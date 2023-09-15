//
// Copyright 2023 DXOS.org
//
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { sortByIndex } from '@tldraw/indices';
import React, { forwardRef } from 'react';

import { Tile } from './';
import { useMosaic } from '../mosaic';
import { StackTile } from '../types';

const Stack = forwardRef<HTMLDivElement, StackTile>((tile, forwardedRef) => {
  const {
    mosaic: { tiles, relations },
    data: { [tile.id]: stackData },
    Delegator,
  } = useMosaic();
  const subtileIds = relations[tile.id]?.child ?? new Set();
  const subtiles = Array.from(subtileIds)
    .map((id) => tiles[id])
    .sort(sortByIndex);

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
