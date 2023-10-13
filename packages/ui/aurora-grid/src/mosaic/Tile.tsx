//
// Copyright 2023 DXOS.org
//

import { useDraggable } from '@dnd-kit/core';
import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import React, { type ForwardRefExoticComponent, type HTMLAttributes, type RefAttributes } from 'react';

import { type MosaicOperation, type MosaicTileOverlayProps } from './Container';
import { DefaultComponent } from './DefaultComponent';
import { useMosaic } from './hooks';
import { type MosaicDataItem, type MosaicDraggedItem } from './types';
import { getTransformCSS, Path } from './util';

export type MosaicActiveType = 'overlay' | 'rearrange' | 'origin' | 'destination';

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
    position?: TPosition;
    operation?: MosaicOperation;
    active?: MosaicActiveType;

    // DndKit props.
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
      position={position}
      operation={operation}
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
  const { setNodeRef, attributes, listeners, transform, isDragging, isOver } = useSortable({
    id: path,
    data: { path, item, position } satisfies MosaicDraggedItem,
    animateLayoutChanges: (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true }),
  });

  let active: MosaicActiveType | undefined;
  if (
    !isDragging &&
    operation !== 'reject' &&
    activeItem &&
    activeItem.item.id === item.id &&
    overItem &&
    (Path.hasChild(Path.parent(path), overItem.path) || Path.parent(path) === overItem.path || path === overItem.path)
  ) {
    active = 'destination';
  } else if (activeItem && activeItem.item.id === item.id) {
    active = operation === 'rearrange' ? 'rearrange' : 'origin';
  }

  return (
    <Component
      ref={setNodeRef}
      item={item}
      path={path}
      position={position}
      operation={operation}
      active={active}
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
