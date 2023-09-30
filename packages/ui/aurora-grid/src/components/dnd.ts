//
// Copyright 2023 DXOS.org
//

import { ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from 'react';

// Definitions:
// - Mosaic: container that manages the layout of a set of tiles (e.g., Stack, Grid, Tree, Table).
// - Tile: component that is rendered within the layout and is draggable.
// - Item: datum represented by a Tile.

/**
 * props passed to mosaic tile.
 */
export type DraggableProps<T> = Pick<HTMLAttributes<HTMLDivElement>, 'className'> & {
  id: string;
  data: T;
  isDragging?: boolean;
  draggableStyle?: any;
  draggableProps?: any;

  // TODO(burdon): Generalize events.
  onSelect?: () => void;
};

/**
 * Item passed to mosaic container.
 */
export type DraggableItem<TData, TPosition> = {
  id: string;
  data: TData;
  // TODO(burdon): Decouple position and component delegate.
  position?: TPosition;
  Component: ForwardRefExoticComponent<DraggableProps<TData> & RefAttributes<HTMLDivElement>>;
};
