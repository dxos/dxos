//
// Copyright 2023 DXOS.org
//

import { type FC } from 'react';

import {
  MosaicContainer,
  type MosaicContainerProps as NaturalMosaicContainerProps,
  type MosaicMoveEvent as NaturalMosaicMoveEvent,
  type MosaicDropEvent as NaturalMosaicDropEvent,
  type MosaicOperation as NaturalMosaicOperation,
  type MosaicCompareDataItem as NaturalMosaicCompareDataItem,
} from './Container';
import { Debug, type DebugProps } from './Debug';
import { DefaultComponent } from './DefaultComponent';
import { MosaicDragOverlay, type MosaicDragOverlayProps } from './DragOverlay';
import { MosaicRoot, type MosaicRootProps as NaturalMosaicRootProps } from './Root';
import { MosaicSortableContext, type MosaicSortableProps as NaturalMosaicSortableProps } from './SortableContext';
import {
  DraggableTile,
  DroppableTile,
  SortableTile,
  type MosaicTileProps as NaturalMosaicTileProps,
  type MosaicTileComponent as NaturalMosaicTileComponent,
  type MosaicActiveType as NaturalMosaicActiveType,
} from './Tile';
import { type MosaicDataItem } from './types';

export const Mosaic = {
  Root: MosaicRoot,
  Container: MosaicContainer,
  DragOverlay: MosaicDragOverlay,
  SortableContext: MosaicSortableContext,
  DraggableTile,
  DroppableTile,
  SortableTile,

  // TODO(wittjosiah): Consider factoring out or using inline styles instead depending on DXOS UI theme/tailwind.
  DefaultComponent,
  // TODO(burdon): Don't export; move to util.
  Debug,
} as {
  Root: FC<MosaicRootProps>;
  Container: FC<MosaicContainerProps<any, any>>;
  DragOverlay: FC<MosaicOverlayProps>;
  SortableContext: FC<MosaicSortableProps>;
  DraggableTile: FC<MosaicTileProps<any, any>>;
  DroppableTile: FC<MosaicTileProps<any, any>>;
  SortableTile: FC<MosaicTileProps<any, number>>;

  DefaultComponent: MosaicTileComponent;
  Debug: FC<MosaicDebugProps>;
};

export type MosaicRootProps = NaturalMosaicRootProps;

export type MosaicContainerProps<
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
> = NaturalMosaicContainerProps<TData, TPosition>;

export type MosaicOverlayProps = MosaicDragOverlayProps;

export type MosaicSortableProps = NaturalMosaicSortableProps;

export type MosaicTileProps<
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
> = NaturalMosaicTileProps<TData, TPosition>;

export type MosaicTileComponent<
  TData extends MosaicDataItem = MosaicDataItem,
  TElement extends HTMLElement = HTMLDivElement,
> = NaturalMosaicTileComponent<TData, TElement>;

export type MosaicDebugProps = DebugProps;

export type MosaicMoveEvent<TPosition = unknown> = NaturalMosaicMoveEvent<TPosition>;
export type MosaicDropEvent<TPosition = unknown> = NaturalMosaicDropEvent<TPosition>;
export type MosaicOperation = NaturalMosaicOperation;
export type MosaicActiveType = NaturalMosaicActiveType;

export type MosaicCompareDataItem = NaturalMosaicCompareDataItem;
