//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { DeepSignal } from 'deepsignal';
import { ComponentPropsWithoutRef, FC, PropsWithChildren, RefAttributes } from 'react';

import { EventHandler } from './dnd';

export type TileVariant = 'stack' | 'card' | 'treeitem';

type TileSharedProps = {
  // Primary props
  id: string;
  index: string;
  variant: TileVariant;
  migrationClass?: string;
  acceptMigrationClass?: Set<string>;
  copyClass?: Set<string>;
  acceptCopyClass?: string;
  sortable?: boolean;
  // Secondary props
  isPreview?: boolean;
};

export type TreeItemTile = TileSharedProps & {
  // Overrides
  variant: 'treeitem';
  sortable: true;
  // Special flags
  level: number;
  expanded?: boolean;
};

export type StackTile = TileSharedProps & {
  // Overrides
  variant: 'stack';
  sortable: true;
};

export type CardTile = TileSharedProps & {
  // Overrides
  variant: 'card';
  sortable?: false;
};

// TODO(burdon): Make generic to unbundle deps.
export type Tile = TreeItemTile | StackTile | CardTile;

export type TileProps = Tile;

export type MosaicState = {
  tiles: Record<string, Tile>;
  relations: Record<string, Record<string, Set<string>>>;
};

export type DelegatorProps<TData = any> = PropsWithChildren<{
  data: TData;
  tile: Tile;
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

export type MosaicRearrangeEvent = { type: 'rearrange'; id: string; index: string };
export type MosaicMigrateEvent = { type: 'migrate'; id: string; fromId: string; toId: string; index?: string };
export type MosaicCopyEvent = { type: 'copy'; id: string; toId: string; index?: string };
export type MosaicChangeEvent = MosaicRearrangeEvent | MosaicMigrateEvent | MosaicCopyEvent;

export type MosaicChangeHandler = EventHandler<MosaicChangeEvent>;

export type CopyTileAction = (id: string, toId: string, mosaic: MosaicState) => Tile;

export type MosaicContextValue = {
  getData: (dndId: string) => any;
  mosaic: DeepSignal<MosaicState>;
  onMosaicChange?: MosaicChangeHandler;
  copyTile: CopyTileAction;
  Delegator: Delegator;
};

export type MosaicRootContextValue = {
  id: string;
};

export type MosaicRootProps = Omit<MosaicRootContextValue, 'id'> & Partial<Pick<MosaicRootContextValue, 'id'>>;
