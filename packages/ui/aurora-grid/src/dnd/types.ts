//
// Copyright 2023 DXOS.org
//

import { CSSProperties, ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from 'react';

export type Dimension = { width: number; height: number };

export type MosaicDataItem = { id: string };

export type MosaicDraggedItem<TPosition = unknown> = {
  container: string;
  item: MosaicDataItem;
  position?: TPosition; // Index or layout-specific positional information (stored separately from the item).
};

export type MosaicMoveEvent<TPosition = unknown> = {
  container: string;
  active: MosaicDraggedItem<TPosition>;
  over: MosaicDraggedItem<TPosition>;
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
export type MosaicContainerProps<TData extends MosaicDataItem, TPosition = unknown> = Pick<
  HTMLAttributes<HTMLDivElement>,
  'className'
> & {
  id: string;
  Component?: MosaicTileComponent<TData>;
  getOverlayStyle?: () => CSSProperties;

  // TODO(burdon): Handle copy, delete, etc.
  onMoveItem?: (event: MosaicMoveEvent<TPosition>) => void;
};
