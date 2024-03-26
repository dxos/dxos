//
// Copyright 2023 DXOS.org
//

import { type DraggableAttributes, useDraggable, useDroppable } from '@dnd-kit/core';
import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import React from 'react';
import type { CSSProperties, ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { DEFAULT_TYPE, type MosaicOperation, type MosaicTileOverlayProps } from './Container';
import { DefaultComponent } from './DefaultComponent';
import { useContainer, useMosaic } from './hooks';
import type { MosaicDataItem, MosaicDraggedItem } from './types';
import { getTransformCSS, Path } from './util';

export type MosaicActiveType = 'overlay' | 'rearrange' | 'origin' | 'destination';

// TODO(wittjosiah): `id` should be `path` and `data` should be a `MosaicDataItem`.
export type MosaicTileAction = { id: string; action: string; data?: any };

/**
 * Props passed to mosaic tile.
 */
export type MosaicTileProps<TData extends MosaicDataItem = MosaicDataItem, TPosition = unknown> = ThemedClassName<{}> &
  MosaicTileOverlayProps & {
    path: string;
    item: TData;
    Component?: MosaicTileComponent<TData, any>;
    position?: TPosition;
    type?: string;
    operation?: MosaicOperation;
    active?: MosaicActiveType; // TODO(burdon): Rename state?

    // DndKit props.
    isDragging?: boolean;
    isOver?: boolean;
    draggableStyle?: CSSProperties;
    draggableProps?: DraggableAttributes &
      // TODO(wittjosiah): SyntheticListenerMap.
      HTMLAttributes<HTMLElement>;

    // TODO(burdon): Generalize events via onAction?
    onSelect?: () => void;
    onDelete?: (force?: boolean) => void;
    onNavigate?: () => void;
    onAddBefore?: () => void;
    onAddAfter?: () => void;
    onAction?: (action: MosaicTileAction) => void;
  };

export type MosaicTileComponentProps<TData extends MosaicDataItem = MosaicDataItem> = Omit<
  MosaicTileProps<TData>,
  'Component' | 'operation'
> & { operation: MosaicOperation };

/**
 * Mosaic Tile component.
 */
export type MosaicTileComponent<
  TData extends MosaicDataItem = MosaicDataItem,
  TElement extends HTMLElement = HTMLDivElement,
  TProps = {},
> = ForwardRefExoticComponent<RefAttributes<TElement> & MosaicTileComponentProps<TData> & TProps>;

/**
 * Basic draggable mosaic tile.
 */
export const DraggableTile = ({
  path: parentPath,
  type = DEFAULT_TYPE,
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
    data: { path, type, item, position } satisfies MosaicDraggedItem,
  });

  return (
    <Component
      ref={setNodeRef}
      item={item}
      path={path}
      type={type}
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
 * Basic droppable mosaic tile.
 */
export const DroppableTile = ({
  path: parentPath,
  type = DEFAULT_TYPE,
  item,
  Component = DefaultComponent,
  position,
  ...props
}: MosaicTileProps<any>) => {
  const { operation } = useMosaic();
  const path =
    parentPath === item.id
      ? parentPath // If the path is the same as the item id, then this is the root tile.
      : Path.create(parentPath, item.id);
  const { setNodeRef, isOver } = useDroppable({
    id: path,
    data: { path, type, item, position } satisfies MosaicDraggedItem,
  });

  return (
    <Component
      ref={setNodeRef}
      item={item}
      path={path}
      type={type}
      position={position}
      operation={operation}
      isOver={isOver}
      {...props}
    />
  );
};

/**
 * Mosaic tile that can be sorted.
 */
export const SortableTile = ({
  path: parentPath,
  type = DEFAULT_TYPE,
  item,
  Component: OverrideComponent,
  position,
  draggableStyle,
  ...props
}: MosaicTileProps<any, number>) => {
  const { operation, activeItem, overItem } = useMosaic();
  const { transitionDuration, Component: ContainerComponent } = useContainer();

  const path = Path.create(parentPath, item.id);
  // Re-use the active path if it's the same item and the item is a preview.
  // This helps dndkit understand that the item is being moved and animate it appropriately.
  const isPreview =
    activeItem &&
    activeItem.item.id === item.id &&
    overItem &&
    !Path.siblings(activeItem.path, overItem.path) &&
    (Path.siblings(overItem.path, path) || Path.hasChild(overItem.path, path)) &&
    operation !== 'reject';

  const { setNodeRef, attributes, listeners, transform, isDragging, isOver } = useSortable({
    id: isPreview ? activeItem.path : path,
    data: { path, type, item, position } satisfies MosaicDraggedItem,
    animateLayoutChanges: (args) =>
      defaultAnimateLayoutChanges({ ...args, wasDragging: item.id !== activeItem?.item.id }),
  });

  let active: MosaicActiveType | undefined;
  if (isDragging) {
    if (operation === 'rearrange' || operation === 'reject') {
      active = 'rearrange';
    } else if (activeItem && Path.parent(activeItem.path) !== parentPath) {
      active = 'destination';
    } else {
      active = 'origin';
    }
  }

  const Component = OverrideComponent ?? ContainerComponent ?? DefaultComponent;

  return (
    <Component
      ref={setNodeRef}
      item={item}
      path={path}
      type={type}
      position={position}
      operation={operation}
      active={active}
      isDragging={isDragging}
      isOver={isOver}
      draggableStyle={{
        transform: getTransformCSS(transform),
        transition: transform ? `transform ${transitionDuration}ms ease` : 'none',
        ...draggableStyle,
      }}
      draggableProps={{ ...attributes, ...listeners }}
      {...props}
    />
  );
};
