//
// Copyright 2023 DXOS.org
//

import { useDraggable } from '@dnd-kit/core';
import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import React, { ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from 'react';

import { MosaicTileOverlayProps } from './Container';
import { DefaultComponent } from './DefaultComponent';
import { useMosaic } from './hooks';
import { MosaicDataItem, MosaicDraggedItem } from './types';
import { getTransformCSS, Path } from './util';

/**
 * Props passed to mosaic tile.
 */
export type MosaicTileProps<TData extends MosaicDataItem = MosaicDataItem, TPosition = unknown> = Pick<
  HTMLAttributes<HTMLDivElement>,
  'className'
> &
  MosaicTileOverlayProps & {
    Component: MosaicTileComponent<TData>;
    container: string; // TODO(wittjosiah): Rename to path.
    item: TData;

    position?: TPosition;
    isActive?: boolean;
    isDragging?: boolean;
    draggableStyle?: any;
    draggableProps?: any;

    // TODO(burdon): Generalize tile events (or use intents?)
    onSelect?: () => void;
  };

/**
 * Mosaic Tile component.
 */
export type MosaicTileComponent<TData extends MosaicDataItem = MosaicDataItem> = ForwardRefExoticComponent<
  RefAttributes<HTMLDivElement> & Omit<MosaicTileProps<TData>, 'Component'>
>;

/**
 * Basic draggable mosaic tile.
 */
export const DraggableTile = ({
  container,
  item,
  Component = DefaultComponent,
  position,
  draggableStyle,
  ...props
}: MosaicTileProps<any>) => {
  const { activeItem, overItem } = useMosaic();
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    isDragging: isDraggingLocal,
  } = useDraggable({
    id: Path.create(container, item.id),
    data: { container, item, position } satisfies MosaicDraggedItem,
  });
  const isDragging = isDraggingLocal || (activeItem?.item.id === item.id && overItem?.container === container);

  return (
    <Component
      ref={setNodeRef}
      item={item}
      container={container}
      position={position}
      isDragging={isDragging}
      draggableStyle={{
        transform: getTransformCSS(transform),
        ...draggableStyle,
      }}
      draggableProps={{ ...attributes, ...listeners }}
      {...props}
    />
  );
};

/**
 * Mosaic tile that can be sorted.
 */
export const SortableTile = ({
  container,
  item,
  Component = DefaultComponent,
  position,
  draggableStyle,
  ...props
}: MosaicTileProps<any, number>) => {
  const { activeItem, overItem } = useMosaic();
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    isDragging: isDraggingLocal,
  } = useSortable({
    id: Path.create(container, item.id),
    data: { container, item, position } satisfies MosaicDraggedItem,
    animateLayoutChanges: (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true }),
  });

  // If not dragging locally but:
  // - active item id matches AND
  // - the over container matches THEN
  // - this tile is being dragged from another container
  const isDragging = isDraggingLocal || (activeItem?.item.id === item.id && overItem?.container === container);

  return (
    <Component
      ref={setNodeRef}
      item={item}
      container={container}
      position={position}
      isDragging={isDragging}
      draggableStyle={{
        transform: getTransformCSS(transform),
        transition: activeItem ? 'transform 200ms ease' : 'none',
        ...draggableStyle,
      }}
      draggableProps={{ ...attributes, ...listeners }}
      {...props}
    />
  );
};
