//
// Copyright 2023 DXOS.org
//

import { useDraggable } from '@dnd-kit/core';
import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import React, { type ForwardRefExoticComponent, type HTMLAttributes, type RefAttributes } from 'react';

import { MosaicOperation, MosaicTileOverlayProps } from './Container';
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
    path: string;
    item: TData;

    operation?: MosaicOperation;
    position?: TPosition;
    // TODO(wittjosiah): active?: 'overlay' | 'rearrange' | 'origin' | 'destination';
    isActive?: boolean;
    isDragging?: boolean;
    isOver?: boolean;
    draggableStyle?: any;
    draggableProps?: any;

    // TODO(burdon): Generalize tile events (or use intents?)
    onSelect?: () => void;
  };

/**
 * Mosaic Tile component.
 */
export type MosaicTileComponent<TData extends MosaicDataItem = MosaicDataItem> = ForwardRefExoticComponent<
  RefAttributes<HTMLDivElement> &
    Omit<MosaicTileProps<TData>, 'Component' | 'operation'> & { operation: MosaicOperation }
>;

/**
 * Basic draggable mosaic tile.
 */
export const DraggableTile = ({
  path: parentPath,
  item,
  Component = DefaultComponent,
  position,
  draggableStyle,
  ...props
}: MosaicTileProps<any>) => {
  const { operation } = useMosaic();
  const path = Path.create(parentPath, item.id);
  const { setNodeRef, attributes, listeners, /* transform, */ isDragging } = useDraggable({
    id: path,
    data: { path, item, position } satisfies MosaicDraggedItem,
  });

  return (
    <Component
      ref={setNodeRef}
      item={item}
      path={path}
      operation={operation}
      position={position}
      isDragging={isDragging}
      draggableStyle={{
        // TODO(burdon): Override by container?
        // transform: getTransformCSS(transform),
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
  path: parentPath,
  item,
  Component = DefaultComponent,
  position,
  draggableStyle,
  ...props
}: MosaicTileProps<any, number>) => {
  const { operation, activeItem, overItem } = useMosaic();
  // TODO(wittjosiah): If this is the active item, then use the same id.
  const path = Path.create(parentPath, item.id);
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    isDragging: isDraggingLocal,
    isOver,
  } = useSortable({
    id: path,
    data: { path, item, position } satisfies MosaicDraggedItem,
    animateLayoutChanges: (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true }),
  });

  // TODO(wittjosiah): Use same id for active item to avoid inference.
  // If not dragging locally but:
  // - active item id matches AND
  // - the over path matches THEN
  // - this tile is being dragged from another path
  const isDragging =
    isDraggingLocal ||
    (operation !== 'reject' &&
      activeItem?.item.id === item.id &&
      overItem &&
      (Path.hasChild(Path.parent(path), overItem.path) ||
        Path.parent(path) === overItem.path ||
        path === overItem.path));

  return (
    <Component
      ref={setNodeRef}
      item={item}
      path={path}
      operation={operation}
      position={position}
      isDragging={isDragging}
      isOver={isOver}
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
