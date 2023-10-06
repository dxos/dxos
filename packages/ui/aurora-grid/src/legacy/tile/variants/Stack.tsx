//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { sortByIndex } from '@tldraw/indices';
import React, { forwardRef, Ref } from 'react';

import { useMosaicDnd } from '../../dnd';
import { useMosaic, TileProps, DelegatorProps } from '../../mosaic';
import { Tile } from '../Tile';

export type StackTileProps = TileProps & {
  // Overrides
  variant: 'stack';
  sortable: true;
};

export const isStackTile = (tile: TileProps): tile is StackTileProps => tile.variant === 'stack';

/**
 * Sortable container.
 */
const StackImpl = forwardRef<HTMLDivElement, Omit<DelegatorProps, 'data'>>((props, forwardedRef) => {
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
      <SortableContext items={subtiles} strategy={verticalListSortingStrategy}>
        {subtiles.map((tile) => (
          <Tile key={tile.id} {...tile} />
        ))}
      </SortableContext>
    </Delegator>
  );
});

/**
 * Stack that can be contained within a sortable container.
 */
const StackSortableImpl = forwardRef<HTMLDivElement, StackTileProps>((tile, forwardedRef) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: tile.id,
    data: tile,
  });

  const ref = useComposedRefs(setNodeRef, forwardedRef);
  return (
    <StackImpl
      tile={tile}
      dragHandleAttributes={attributes}
      dragHandleListeners={listeners}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      ref={ref as Ref<HTMLDivElement>}
    />
  );
});

/**
 * Stack that can receive dropped components.
 */
const StackDroppableImpl = forwardRef<HTMLDivElement, StackTileProps>((tile, forwardedRef) => {
  const { setNodeRef } = useDroppable({
    id: tile.id,
    data: tile,
  });

  const ref = useComposedRefs(setNodeRef, forwardedRef);
  return <StackImpl tile={tile} ref={ref as Ref<HTMLDivElement>} />;
});

/**
 * Stack variants.
 */
const Stack = forwardRef<HTMLDivElement, StackTileProps>((tile, forwardedRef) => {
  const {
    mosaic: { tiles, relations },
  } = useMosaic();

  if (relations[tile.id]?.parent?.size > 0 && tiles[Array.from(relations[tile.id]?.parent)[0]].sortable) {
    return <StackSortableImpl {...tile} ref={forwardedRef} />;
  } else if (tile.acceptCopyClass) {
    return <StackDroppableImpl {...tile} ref={forwardedRef} />;
  } else {
    return <StackImpl tile={tile} ref={forwardedRef} />;
  }
});

export { Stack };
