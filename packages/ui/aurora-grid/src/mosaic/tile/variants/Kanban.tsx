//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { sortByIndex } from '@tldraw/indices';
import React, { forwardRef, Ref } from 'react';

import { useMosaicDnd } from '../../dnd';
import { DelegatorProps, TileProps, useMosaic } from '../../mosaic';
import { Tile } from '../Tile';

export type KanbanTileProps = TileProps & {
  // Overrides
  variant: 'kanban';
  sortable: true;
};

const KanbanImpl = forwardRef<HTMLDivElement, Omit<DelegatorProps, 'data'>>((props, forwardedRef) => {
  const {
    mosaic: { tiles, relations },
    getData,
    Delegator,
  } = useMosaic();
  const { migrationDestinationId, copyDestinationId } = useMosaicDnd();
  const subtileIds = relations[props.tile.id]?.child ?? new Set();
  const subtiles = Array.from(subtileIds)
    .map((id) => tiles[id])
    .sort(sortByIndex);

  const isMigrationDestination = props.tile.id === migrationDestinationId;
  const isCopyDestination = props.tile.id === copyDestinationId;
  const isEmpty = subtiles.length < 1;

  return (
    <Delegator
      data={getData(props.tile.id)}
      {...props}
      ref={forwardedRef}
      {...{ isMigrationDestination, isCopyDestination, isEmpty, isPreview: props.isPreview }}
    >
      <SortableContext items={subtiles} strategy={horizontalListSortingStrategy}>
        {subtiles.map((tile) => (
          <Tile key={tile.id} {...tile} />
        ))}
      </SortableContext>
    </Delegator>
  );
});

const KanbanDroppableImpl = forwardRef<HTMLDivElement, KanbanTileProps>((tile, forwardedRef) => {
  const { setNodeRef } = useDroppable({
    id: tile.id,
    data: tile,
  });
  const ref = useComposedRefs(setNodeRef, forwardedRef);
  return <KanbanImpl tile={tile} ref={ref as Ref<HTMLDivElement>} />;
});

const Kanban = forwardRef<HTMLDivElement, KanbanTileProps>((tile, forwardedRef) => {
  if (tile.acceptCopyClass) {
    return <KanbanDroppableImpl {...tile} ref={forwardedRef} />;
  } else {
    return <KanbanImpl tile={tile} ref={forwardedRef} />;
  }
});

export { Kanban };
