//
// Copyright 2025 DXOS.org
//

import { MosaicContainer, type MosaicContainerProps, type MosaicScrollController } from './Container.tsx';
import { MosaicDragHandle, type MosaicDragHandleProps } from './DragHandle.tsx';
import { type MosaicContainerState, useMosaicContainerContext } from './MosaicContainerContext.ts';
import { type MosaicTileState, useMosaicTileContext } from './MosaicTileContext.ts';
import {
  MosaicDropIndicator,
  type MosaicDropIndicatorProps,
  MosaicPlaceholder,
  type MosaicPlaceholderProps,
} from './Placeholder.tsx';
import { MosaicResizeHandle, type MosaicResizeHandleProps } from './ResizeHandle.tsx';
import { MosaicStack, type MosaicStackProps, type MosaicStackTileComponent, MosaicVirtualStack } from './Stack.tsx';
import { MosaicTile, type MosaicTileProps } from './Tile.tsx';

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
