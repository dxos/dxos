//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { DeepSignal } from 'deepsignal';
import { ComponentPropsWithoutRef, FC, PropsWithChildren, RefAttributes } from 'react';

export type TileVariant = 'stack' | 'card' | 'treeitem';

type TileSharedProps = {
  // Primary props
  id: string;
  index: string;
  variant: TileVariant;
  migrationClass?: string;
  acceptMigrationClass?: Set<string>;
  // Secondary props
  sortable?: boolean;
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

export type Tile = TreeItemTile | StackTile | CardTile;

export type TileProps = Tile;

export type MosaicState = {
  tiles: Record<string, Tile>;
  relations: Record<string, Record<string, Set<string>>>;
};

export type DelegatorProps<D = any> = PropsWithChildren<{
  data: D;
  tile: Tile;
  dragHandleAttributes?: ReturnType<typeof useSortable>['attributes'];
  dragHandleListeners?: ReturnType<typeof useSortable>['listeners'];
  style?: ComponentPropsWithoutRef<'div'>['style'];
  isActive?: boolean;
  isMigrationDestination?: boolean;
  isOverlay?: boolean;
}>;

export type Delegator = FC<DelegatorProps & RefAttributes<HTMLElement>>;

export type Handler<E> = (event: E) => void;

export type MosaicRearrangeEvent = { type: 'rearrange'; id: string; index: string };
export type MosaicMigrateEvent = { type: 'migrate'; id: string; fromId: string; toId: string; relation: string };

export type MosaicChangeEvent = MosaicRearrangeEvent | MosaicMigrateEvent;

export type MosaicChangeHandler = Handler<MosaicChangeEvent>;

export type MosaicContextValue = {
  data: Record<string, any>;
  mosaic: DeepSignal<MosaicState>;
  onMosaicChange?: MosaicChangeHandler;
  Delegator: Delegator;
};

export type MosaicRootContextValue = {
  id: string;
};

export type MosaicRootProps = Omit<MosaicRootContextValue, 'id'> & Partial<Pick<MosaicRootContextValue, 'id'>>;
