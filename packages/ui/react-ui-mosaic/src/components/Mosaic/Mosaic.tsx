//
// Copyright 2025 DXOS.org
//

import {
  MosaicContainer,
  type MosaicContainerProps,
  type MosaicContainerState,
  type MosaicScrollController,
  useMosaicContainerContext,
} from './Container';
import { MosaicDragHandle, type MosaicDragHandleProps } from './DragHandle';
import {
  MosaicDropIndicator,
  type MosaicDropIndicatorProps,
  MosaicPlaceholder,
  type MosaicPlaceholderProps,
} from './Placeholder';
import { MosaicResizeHandle, type MosaicResizeHandleProps } from './ResizeHandle';
import { MosaicStack, type MosaicStackProps, type MosaicStackTileComponent, MosaicVirtualStack } from './Stack';
import { MosaicTile, type MosaicTileProps, type MosaicTileState, useMosaicTileContext } from './Tile';

//
// Mosaic
//

export const Mosaic = {
  Container: MosaicContainer,
  Tile: MosaicTile,
  DragHandle: MosaicDragHandle,
  ResizeHandle: MosaicResizeHandle,
  Placeholder: MosaicPlaceholder,
  DropIndicator: MosaicDropIndicator,
  Stack: MosaicStack,
  VirtualStack: MosaicVirtualStack,
};

export type {
  MosaicContainerProps,
  MosaicContainerState,
  MosaicDragHandleProps,
  MosaicDropIndicatorProps,
  MosaicPlaceholderProps,
  MosaicResizeHandleProps,
  MosaicScrollController,
  MosaicStackProps,
  MosaicStackTileComponent,
  MosaicTileProps,
  MosaicTileState,
};

export { useMosaicContainerContext as useMosaicContainer, useMosaicTileContext as useMosaicTile };
