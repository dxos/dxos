//
// Copyright 2023 DXOS.org
//
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { sortByIndex } from '@tldraw/indices';
import React, { forwardRef } from 'react';

import { Tile } from './';
import { useDnd } from '../dnd';
import { useMosaic } from '../mosaic';
import { StackTile } from '../types';

const Stack = forwardRef<HTMLDivElement, StackTile>((tile, forwardedRef) => {
  const {
    mosaic: { tiles, relations },
    getData,
    Delegator,
  } = useMosaic();
  const { migrationDestinationId, copyDestinationId } = useDnd();
  const subtileIds = relations[tile.id]?.child ?? new Set();
  const subtiles = Array.from(subtileIds)
    .map((id) => tiles[id])
    .sort(sortByIndex);

  const isMigrationDestination = tile.id === migrationDestinationId;
  const isCopyDestination = tile.id === copyDestinationId;

  return (
    <Delegator
      data={getData(tile.id)}
      tile={tile}
      ref={forwardedRef}
      {...{ isMigrationDestination, isCopyDestination }}
    >
      <SortableContext items={subtiles} strategy={verticalListSortingStrategy}>
        {subtiles.map((tile) => (
          <Tile key={tile.id} {...tile} />
        ))}
      </SortableContext>
    </Delegator>
  );
});

export { Stack };
