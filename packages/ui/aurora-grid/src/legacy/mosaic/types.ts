//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { ComponentPropsWithoutRef, FC, PropsWithChildren, RefAttributes } from 'react';

import { EventHandler } from '../dnd';
import { TileProps } from '.';

//
// Delegator
//

export type DelegatorProps<TData = any> = PropsWithChildren<{
  data: TData;
  tile: TileProps;
  dragHandleAttributes?: ReturnType<typeof useSortable>['attributes'];
  dragHandleListeners?: ReturnType<typeof useSortable>['listeners'];
  style?: ComponentPropsWithoutRef<'div'>['style'];
  isActive?: boolean;
  isMigrationDestination?: boolean;
  isCopyDestination?: boolean;
  isOverlay?: boolean;
  isEmpty?: boolean;
  isPreview?: boolean;
}>;

export type Delegator = FC<DelegatorProps & RefAttributes<HTMLElement>>;

//
// Events
//

export type MosaicRearrangeEvent = { type: 'rearrange'; id: string; index: string };
export type MosaicMigrateEvent = { type: 'migrate'; id: string; fromId: string; toId: string; index?: string };
export type MosaicCopyEvent = { type: 'copy'; id: string; toId: string; index?: string };
export type MosaicChangeEvent = MosaicRearrangeEvent | MosaicMigrateEvent | MosaicCopyEvent;

export type MosaicChangeHandler = EventHandler<MosaicChangeEvent>;

//
// Global state
//

export type MosaicState = {
  // Map of all draggable tiles.
  tiles: Record<string, TileProps>;

  // Relationships between tiles (i.e., hierarchy).
  relations: Record<string, Record<string, Set<string>>>;
};

export type Operation = 'copy' | 'migrate';

export type CopyTileAction = (id: string, toId: string, mosaic: MosaicState, operation: Operation) => TileProps;
