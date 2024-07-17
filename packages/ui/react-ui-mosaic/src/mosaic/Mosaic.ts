//
// Copyright 2023 DXOS.org
//

import { type FC, type RefAttributes } from 'react';

import {
  MosaicContainer,
  type MosaicContainerProps as NaturalMosaicContainerProps,
  type MosaicMoveEvent as NaturalMosaicMoveEvent,
  type MosaicDropEvent as NaturalMosaicDropEvent,
  type MosaicOperation as NaturalMosaicOperation,
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
  type MosaicTileAction as NaturalMosaicTileAction,
  type MosaicTileProps as NaturalMosaicTileProps,
  type MosaicTileComponent as NaturalMosaicTileComponent,
  type MosaicActiveType as NaturalMosaicActiveType,
  type MosaicTileComponentProps as NaturalMosaicTileComponentProps,
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
  DroppableTile: FC<RefAttributes<HTMLDivElement> & MosaicTileProps<any, any>>;
  SortableTile: FC<MosaicTileProps<any, number>>;

  DefaultComponent: MosaicTileComponent;
  Debug: FC<MosaicDebugProps>;
};

export type MosaicRootProps = NaturalMosaicRootProps;

export type MosaicContainerProps<
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
  TMoveDetails = Record<string, unknown>,
  TTileElement extends HTMLElement = HTMLDivElement,
  TTileProps = {},
> = NaturalMosaicContainerProps<TData, TPosition, TMoveDetails, TTileElement, TTileProps>;

export type MosaicOverlayProps = MosaicDragOverlayProps;

export type MosaicSortableProps = NaturalMosaicSortableProps;

export type MosaicTileAction = NaturalMosaicTileAction;

export type MosaicTileProps<
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
> = NaturalMosaicTileProps<TData, TPosition>;

export type MosaicTileComponent<
  TData extends MosaicDataItem = MosaicDataItem,
  TElement extends HTMLElement = HTMLDivElement,
  TProps = {},
> = NaturalMosaicTileComponent<TData, TElement, TProps>;

export type MosaicTileComponentProps<TData extends MosaicDataItem = MosaicDataItem> =
  NaturalMosaicTileComponentProps<TData>;

export type MosaicMoveEvent<TPosition = unknown, TMoveDetails = Record<string, unknown>> = NaturalMosaicMoveEvent<
  TPosition,
  TMoveDetails
>;
export type MosaicDropEvent<TPosition = unknown, TMoveDetails = Record<string, unknown>> = NaturalMosaicDropEvent<
  TPosition,
  TMoveDetails
>;
export type MosaicOperation = NaturalMosaicOperation;
export type MosaicActiveType = NaturalMosaicActiveType;

// TODO(burdon): Remove.
export type MosaicDebugProps = DebugProps;
