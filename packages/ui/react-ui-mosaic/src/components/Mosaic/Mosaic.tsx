//
// Copyright 2025 DXOS.org
//

import {
  MosaicContainer,
  type MosaicContainerProps,
  type MosaicContainerState,
  useMosaicContainerContext,
} from './Container';
import {
  MosaicDropIndicator,
  type MosaicDropIndicatorProps,
  MosaicPlaceholder,
  type MosaicPlaceholderProps,
} from './Placeholder';
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
  Placeholder: MosaicPlaceholder,
  DropIndicator: MosaicDropIndicator,
  Stack: MosaicStack,
  VirtualStack: MosaicVirtualStack,
};

export type {
  MosaicRootProps,
  MosaicContainerProps,
  MosaicContainerState,
  MosaicTileProps,
  MosaicTileState,
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
