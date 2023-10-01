//
// Copyright 2023 DXOS.org
//

import { Bounds } from 'packages/ui/aurora-grid/src/components/Grid/util';
import { ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from 'react';

// Definitions:
// - Mosaic: container that manages the layout of a set of tiles (e.g., Stack, Grid, Tree, Table).
// - Tile: component that is rendered within the layout and is draggable.
// - Item: datum represented by a Tile.

export type MosaicDataItem = { id: string };

export type MosaicDraggedItem = {
  container: string;
  item: MosaicDataItem;
  position?: any; // Index or layout-specific positional information (stored separately from the item).
};

export type MosaicMoveEvent = {
  container: string;
  active: MosaicDraggedItem;
  over: MosaicDraggedItem;
};

/**
 * props passed to mosaic tile.
 */
export type MosaicTileProps<TData extends MosaicDataItem> = Pick<HTMLAttributes<HTMLDivElement>, 'className'> & {
  data: TData;

  isActive?: boolean;
  isDragging?: boolean;
  draggableStyle?: any;
  draggableProps?: any;
  debug?: boolean;

  // TODO(burdon): Generalize events (or use intents?)
  onSelect?: () => void;
};

/**
 * Tile component.
 */
export type MosaicTileComponent<TData extends MosaicDataItem> = ForwardRefExoticComponent<
  RefAttributes<HTMLDivElement> & MosaicTileProps<TData>
>;

/**
 * Tile container.
 */
export type MosaicContainerProps<TData extends MosaicDataItem> = {
  id: string;
  Component?: MosaicTileComponent<TData>;
  getBounds?: () => Bounds;

  // TODO(burdon): Handle copy, delete, etc.
  onMoveItem?: (event: MosaicMoveEvent) => void;
};
