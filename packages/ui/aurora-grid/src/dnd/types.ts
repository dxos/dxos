//
// Copyright 2023 DXOS.org
//

import { ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from 'react';

export type Dimension = { width: number; height: number };

export type MosaicDataItem = { id: string };

// TODO(burdon): Any point making this generic?
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

export type MosaicTileOverlayProps = {
  grow?: boolean;
  debug?: boolean;
};

/**
 * props passed to mosaic tile.
 */
export type MosaicTileProps<TData extends MosaicDataItem, TPosition = unknown> = Pick<
  HTMLAttributes<HTMLDivElement>,
  'className'
> &
  MosaicTileOverlayProps & {
    container: string;
    data: TData;
    position: TPosition;

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
export type MosaicTileComponent<TData extends MosaicDataItem> = ForwardRefExoticComponent<
  RefAttributes<HTMLDivElement> & MosaicTileProps<TData>
>;
