//
// Copyright 2025 DXOS.org
//

import {
  type MosaicContainerProps,
  type MosaicContainerState,
  type MosaicScrollController,
  MosaicContainer,
  useMosaicContainerContext,
} from './Container';
import { type MosaicDragHandleProps, MosaicDragHandle } from './DragHandle';
import {
  type MosaicDropIndicatorProps,
  type MosaicPlaceholderProps,
  MosaicDropIndicator,
  MosaicPlaceholder,
} from './Placeholder';
import { type MosaicResizeHandleProps, MosaicResizeHandle } from './ResizeHandle';
import { type MosaicRootProps, MosaicRoot, useMosaicRootContext } from './Root';
import { type MosaicStackProps, type MosaicStackTileComponent, MosaicStack, MosaicVirtualStack } from './Stack';
import { type MosaicTileProps, type MosaicTileState, MosaicTile, useMosaicTileContext } from './Tile';

//
// Mosaic
//

export const Mosaic = {
  Root: MosaicRoot,
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
  MosaicRootProps,
  MosaicScrollController,
  MosaicStackProps,
  MosaicStackTileComponent,
  MosaicTileProps,
  MosaicTileState,
};

export {
  useMosaicRootContext as useMosaic,
  useMosaicContainerContext as useMosaicContainer,
  useMosaicTileContext as useMosaicTile,
};
