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
import {
  MosaicDropIndicator,
  type MosaicDropIndicatorProps,
  MosaicPlaceholder,
  type MosaicPlaceholderProps,
} from './Placeholder';
import { MosaicResizeHandle, type MosaicResizeHandleProps } from './ResizeHandle';
import { MosaicRoot, type MosaicRootProps, useMosaicRootContext } from './Root';
import { MosaicStack, type MosaicStackProps, type MosaicStackTileComponent, MosaicVirtualStack } from './Stack';
import { MosaicTile, type MosaicTileProps, type MosaicTileState, useMosaicTileContext } from './Tile';

//
// Mosaic
//

export const Mosaic = {
  Root: MosaicRoot,
  Container: MosaicContainer,
  Tile: MosaicTile,
  ResizeHandle: MosaicResizeHandle,
  Placeholder: MosaicPlaceholder,
  DropIndicator: MosaicDropIndicator,
  Stack: MosaicStack,
  VirtualStack: MosaicVirtualStack,
};

export type {
  MosaicRootProps,
  MosaicContainerProps,
  MosaicContainerState,
  MosaicScrollController,
  MosaicTileProps,
  MosaicTileState,
  MosaicResizeHandleProps,
  MosaicPlaceholderProps,
  MosaicDropIndicatorProps,
  MosaicStackProps,
  MosaicStackTileComponent,
};

export {
  useMosaicRootContext as useMosaic,
  useMosaicContainerContext as useMosaicContainer,
  useMosaicTileContext as useMosaicTile,
};
