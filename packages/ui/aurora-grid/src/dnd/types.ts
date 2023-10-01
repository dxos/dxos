//
// Copyright 2023 DXOS.org
//

import { ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from 'react';

// Definitions:
// - Mosaic: container that manages the layout of a set of tiles (e.g., Stack, Grid, Tree, Table).
// - Tile: component that is rendered within the layout and is draggable.
// - Item: datum represented by a Tile.

export type MosaicDataItem = { id: string };

/**
 * Item passed to mosaic container.
 */
// TODO(burdon): Must we wrap the underlying ECHO query?
// export type MosaicDataItem<TData, TPosition> = {
//   id: string; // TODO(burdon): Remove.
//   data: TData;
//
//   // TODO(burdon): Generalize to function? E.g., sort.
//   position?: TPosition;
//
//   // Component: MosaicTile<TData>;
// };

export type MosaicDraggedItem = {
  container: string;
  item: MosaicDataItem;
  position?: any;
};

export type MosaicMoveEvent = {
  active: MosaicDraggedItem;
  over: MosaicDraggedItem;
};

/**
 * props passed to mosaic tile.
 */
export type MosaicTileProps<T> = Pick<HTMLAttributes<HTMLDivElement>, 'className'> & {
  id: string;
  data: T;
  isActive?: boolean;
  isDragging?: boolean;
  draggableStyle?: any;
  draggableProps?: any;
  debug?: boolean;

  // TODO(burdon): Generalize events.
  onSelect?: () => void;
};

/**
 * Tile component.
 */
export type MosaicTileComponent<TData> = ForwardRefExoticComponent<
  RefAttributes<HTMLDivElement> & MosaicTileProps<TData>
>;

/**
 * Tile container.
 */
// TODO(burdon): Context for container to wrap.
export type MosaicTileContainer<TData> = ForwardRefExoticComponent<
  RefAttributes<HTMLDivElement> & {
    render: MosaicTileComponent<TData>;
  }
>;
