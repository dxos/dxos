//
// Copyright 2023 DXOS.org
//

import { FC } from 'react';

import {
  MosaicContainer,
  MosaicContainerProps as NaturalMosaicContainerProps,
  MosaicMoveEvent as NaturalMosaicMoveEvent,
  MosaicDropEvent as NaturalMosaicDropEvent,
  MosaicOperation as NaturalMosaicOperation,
  MosaicCompareDataItem as NaturalMosaicCompareDataItem,
} from './Container';
import { Debug, DebugProps } from './Debug';
import { DefaultComponent } from './DefaultComponent';
import { MosaicDragOverlay, MosaicDragOverlayProps } from './DragOverlay';
import { MosaicRoot, MosaicRootProps as NaturalMosaicRootProps } from './Root';
import { MosaicSortableContext, MosaicSortableProps as NaturalMosaicSortableProps } from './SortableContext';
import {
  DraggableTile,
  SortableTile,
  MosaicTileProps as NaturalMosaicTileProps,
  MosaicTileComponent as NaturalMosaicTileComponent,
} from './Tile';
import { MosaicDataItem } from './types';

export const Mosaic = {
  Root: MosaicRoot,
  Container: MosaicContainer,
  DragOverlay: MosaicDragOverlay,
  SortableContext: MosaicSortableContext,
  DraggableTile,
  SortableTile,

  // TODO(wittjosiah): Consider factoring out or using inline styles instead depending on aurora theme/tailwind.
  DefaultComponent,
  // TODO(burdon): Don't export; move to util.
  Debug,
} as {
  Root: FC<MosaicRootProps>;
  Container: FC<MosaicContainerProps<any, any>>;
  DragOverlay: FC<MosaicOverlayProps>;
  SortableContext: FC<MosaicSortableProps>;
  DraggableTile: FC<MosaicTileProps<any, any>>;
  SortableTile: FC<MosaicTileProps<any, number>>;

  DefaultComponent: MosaicTileComponent;
  Debug: FC<MosaicDebugProps>;
};

export type MosaicRootProps = NaturalMosaicRootProps;

export type MosaicContainerProps<
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
  TCustom = any,
> = NaturalMosaicContainerProps<TData, TPosition, TCustom>;

export type MosaicOverlayProps = MosaicDragOverlayProps;

export type MosaicSortableProps = NaturalMosaicSortableProps;

export type MosaicTileProps<
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
> = NaturalMosaicTileProps<TData, TPosition>;

export type MosaicTileComponent<TData extends MosaicDataItem = MosaicDataItem> = NaturalMosaicTileComponent<TData>;

export type MosaicDebugProps = DebugProps;

export type MosaicMoveEvent<TPosition = unknown> = NaturalMosaicMoveEvent<TPosition>;
export type MosaicDropEvent<TPosition = unknown> = NaturalMosaicDropEvent<TPosition>;
export type MosaicOperation = NaturalMosaicOperation;

export type MosaicCompareDataItem = NaturalMosaicCompareDataItem;
